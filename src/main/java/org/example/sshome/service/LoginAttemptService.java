package org.example.sshome.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class LoginAttemptService {

    private final Map<String, Attempt> attempts = new ConcurrentHashMap<>();

    @Value("${security.login.max-attempts:5}")
    private int maxAttempts;

    @Value("${security.login.lock-duration-ms:900000}") // 15 minutes
    private long lockDurationMs;

    public void recordSuccess(String email) {
        attempts.remove(email.toLowerCase());
    }

    public void recordFailure(String email) {
        final String key = email.toLowerCase();
        Attempt attempt = attempts.getOrDefault(key, new Attempt(0, 0));
        int newCount = attempt.count + 1;
        long lockedUntil = attempt.lockedUntil;
        if (newCount >= maxAttempts) {
            lockedUntil = Instant.now().toEpochMilli() + lockDurationMs;
        }
        attempts.put(key, new Attempt(newCount, lockedUntil));
    }

    public boolean isBlocked(String email) {
        Attempt attempt = attempts.get(email.toLowerCase());
        if (attempt == null) {
            return false;
        }
        if (attempt.lockedUntil == 0) {
            return false;
        }
        if (attempt.lockedUntil < Instant.now().toEpochMilli()) {
            attempts.remove(email.toLowerCase());
            return false;
        }
        return true;
    }

    public long remainingLockMillis(String email) {
        Attempt attempt = attempts.get(email.toLowerCase());
        if (attempt == null) {
            return 0;
        }
        return Math.max(0, attempt.lockedUntil - Instant.now().toEpochMilli());
    }

    private record Attempt(int count, long lockedUntil) { }
}
