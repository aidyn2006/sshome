package org.example.sshome.filter;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Token-bucket rate limiter using Bucket4j.
 *
 * <p>Separate limits for:
 * - /auth/** endpoints (brute-force protection): 10 req/min per IP
 * - All other API endpoints: 100 req/min per IP
 *
 * <p>Key = client IP. In production behind a proxy, use X-Forwarded-For.
 */
@Component
@Slf4j
public class JwtRateLimitFilter extends OncePerRequestFilter {

    @Value("${security.rate-limit.api.capacity:100}")
    private int apiCapacity;
    @Value("${security.rate-limit.api.refill-tokens:100}")
    private int apiRefillTokens;
    @Value("${security.rate-limit.api.refill-duration-seconds:60}")
    private int apiRefillSeconds;

    @Value("${security.rate-limit.auth.capacity:10}")
    private int authCapacity;
    @Value("${security.rate-limit.auth.refill-tokens:10}")
    private int authRefillSeconds;

    // IP → Bucket mapping (in production, back with Redis via Bucket4j Redis extension)
    private final ConcurrentHashMap<String, Bucket> apiBuckets  = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Bucket> authBuckets = new ConcurrentHashMap<>();

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res,
                                    FilterChain chain) throws ServletException, IOException {

        String ip = extractClientIp(req);
        boolean isAuthEndpoint = req.getRequestURI().startsWith("/auth/");

        Bucket bucket = isAuthEndpoint
            ? authBuckets.computeIfAbsent(ip, k -> createAuthBucket())
            : apiBuckets.computeIfAbsent(ip,  k -> createApiBucket());

        if (bucket.tryConsume(1)) {
            // Add rate limit headers
            long remaining = bucket.getAvailableTokens();
            res.setHeader("X-RateLimit-Remaining", String.valueOf(remaining));
            chain.doFilter(req, res);
        } else {
            log.warn("Rate limit exceeded: ip={} path={}", ip, req.getRequestURI());
            res.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            res.setContentType(MediaType.APPLICATION_JSON_VALUE);
            res.getWriter().write("""
                {"error":"Too Many Requests","message":"Rate limit exceeded. Please slow down.","status":429}
                """);
        }
    }

    private Bucket createApiBucket() {
        Bandwidth limit = Bandwidth.classic(apiCapacity,
            Refill.greedy(apiRefillTokens, Duration.ofSeconds(apiRefillSeconds)));
        return Bucket.builder().addLimit(limit).build();
    }

    private Bucket createAuthBucket() {
        Bandwidth limit = Bandwidth.classic(authCapacity,
            Refill.greedy(authCapacity, Duration.ofSeconds(60)));
        return Bucket.builder().addLimit(limit).build();
    }

    private String extractClientIp(HttpServletRequest req) {
        String xff = req.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            return xff.split(",")[0].trim();
        }
        String realIp = req.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) return realIp.trim();
        return req.getRemoteAddr();
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest req) {
        String uri = req.getRequestURI();
        // Skip rate limiting for WebSocket upgrades, health checks, static resources
        return uri.startsWith("/ws") || uri.startsWith("/actuator/health");
    }
}
