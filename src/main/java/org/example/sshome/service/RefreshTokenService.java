package org.example.sshome.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.sshome.entity.RefreshToken;
import org.example.sshome.entity.User;
import org.example.sshome.exception.TokenException;
import org.example.sshome.repository.RefreshTokenRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class RefreshTokenService {

    private final RefreshTokenRepository repo;

    @Value("${jwt.refresh-expiration:2592000000}")
    private long refreshExpirationMs;

    @Transactional
    public RefreshToken create(User user, String ipAddress, String userAgent) {
        RefreshToken token = RefreshToken.builder()
            .token(UUID.randomUUID().toString())
            .user(user)
            .expiresAt(Instant.now().plusMillis(refreshExpirationMs))
            .ipAddress(ipAddress)
            .userAgent(userAgent)
            .build();
        return repo.save(token);
    }

    @Transactional(readOnly = true)
    public RefreshToken validate(String tokenStr) {
        RefreshToken token = repo.findByToken(tokenStr)
            .orElseThrow(() -> new TokenException("Refresh token not found"));

        if (!token.isValid()) {
            // Token was revoked or expired - revoke all tokens for this user (suspicious activity)
            if (token.isRevoked()) {
                log.warn("Revoked refresh token used by user={} ip={}",
                    token.getUser().getEmail(), token.getIpAddress());
                repo.revokeAllByUserId(token.getUser().getId(), Instant.now());
            }
            throw new TokenException(token.isRevoked() ? "Token revoked" : "Token expired");
        }
        return token;
    }

    @Transactional
    public void revoke(String tokenStr) {
        repo.findByToken(tokenStr).ifPresent(t -> {
            t.revoke();
            repo.save(t);
        });
    }

    @Transactional
    public void revokeAllForUser(User user) {
        int revoked = repo.revokeAllByUserId(user.getId(), Instant.now());
        log.info("Revoked {} refresh tokens for user={}", revoked, user.getEmail());
    }

    /** Nightly cleanup of expired/revoked tokens */
    @Scheduled(cron = "0 0 3 * * *")
    @Transactional
    public void cleanupExpired() {
        int deleted = repo.deleteExpiredAndRevoked(Instant.now());
        log.info("Cleaned up {} expired/revoked refresh tokens", deleted);
    }
}
