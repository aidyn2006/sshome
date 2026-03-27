package org.example.backend.service;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class RateLimitService {

    // Per-IP buckets
    private final ConcurrentHashMap<String, Bucket> loginBuckets = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Bucket> registerBuckets = new ConcurrentHashMap<>();

    /**
     * @return true if request is allowed, false if rate limit exceeded
     */
    public boolean tryLoginConsume(String ip) {
        return loginBuckets.computeIfAbsent(ip, k -> loginBucket()).tryConsume(1);
    }

    public boolean tryRegisterConsume(String ip) {
        return registerBuckets.computeIfAbsent(ip, k -> registerBucket()).tryConsume(1);
    }

    // 5 login attempts per minute per IP
    private Bucket loginBucket() {
        Bandwidth limit = Bandwidth.builder()
                .capacity(5)
                .refillIntervally(5, Duration.ofMinutes(1))
                .build();
        return Bucket.builder().addLimit(limit).build();
    }

    // 10 register attempts per hour per IP
    private Bucket registerBucket() {
        Bandwidth limit = Bandwidth.builder()
                .capacity(10)
                .refillIntervally(10, Duration.ofHours(1))
                .build();
        return Bucket.builder().addLimit(limit).build();
    }
}
