package org.example.sshome.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.Mac;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * AES-256-GCM encryption + HMAC-SHA256 signing.
 *
 * <p>AES key is derived from the configured 32-byte secret.
 * IV (12 bytes) is prepended to ciphertext and stored together in Base64.
 *
 * <p>Use encryptField() / decryptField() for individual sensitive fields.
 */
@Service
@Slf4j
public class EncryptionService {

    private static final String AES_ALGORITHM    = "AES/GCM/NoPadding";
    private static final int    GCM_IV_LENGTH    = 12;   // bytes
    private static final int    GCM_TAG_BITS     = 128;
    private static final String HMAC_ALGORITHM   = "HmacSHA256";

    private final SecretKey aesKey;
    private final SecretKey hmacKey;
    private final SecureRandom secureRandom = new SecureRandom();

    public EncryptionService(
        @Value("${encryption.aes-key}") String aesKeyStr,
        @Value("${encryption.hmac-secret}") String hmacSecret
    ) {
        // Pad or truncate to exactly 32 bytes for AES-256
        byte[] keyBytes = padTo32Bytes(aesKeyStr.getBytes(StandardCharsets.UTF_8));
        this.aesKey  = new SecretKeySpec(keyBytes, "AES");

        byte[] hmacBytes = padTo32Bytes(hmacSecret.getBytes(StandardCharsets.UTF_8));
        this.hmacKey = new SecretKeySpec(hmacBytes, "HmacSHA256");
    }

    // --- AES-256-GCM Encryption ------------------------------------------

    /**
     * Encrypts plaintext with AES-256-GCM.
     * @return Base64(IV + ciphertext + GCM tag)
     */
    public String encryptField(String plaintext) {
        if (plaintext == null) return null;
        try {
            byte[] iv = new byte[GCM_IV_LENGTH];
            secureRandom.nextBytes(iv);

            Cipher cipher = Cipher.getInstance(AES_ALGORITHM);
            cipher.init(Cipher.ENCRYPT_MODE, aesKey, new GCMParameterSpec(GCM_TAG_BITS, iv));

            byte[] ciphertext = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));

            // Prepend IV to ciphertext
            ByteBuffer buf = ByteBuffer.allocate(GCM_IV_LENGTH + ciphertext.length);
            buf.put(iv);
            buf.put(ciphertext);

            return Base64.getEncoder().encodeToString(buf.array());
        } catch (Exception e) {
            throw new EncryptionException("Encryption failed", e);
        }
    }

    /**
     * Decrypts Base64(IV + ciphertext + GCM tag).
     */
    public String decryptField(String encrypted) {
        if (encrypted == null) return null;
        try {
            byte[] decoded = Base64.getDecoder().decode(encrypted);

            ByteBuffer buf = ByteBuffer.wrap(decoded);
            byte[] iv = new byte[GCM_IV_LENGTH];
            buf.get(iv);
            byte[] ciphertext = new byte[buf.remaining()];
            buf.get(ciphertext);

            Cipher cipher = Cipher.getInstance(AES_ALGORITHM);
            cipher.init(Cipher.DECRYPT_MODE, aesKey, new GCMParameterSpec(GCM_TAG_BITS, iv));

            return new String(cipher.doFinal(ciphertext), StandardCharsets.UTF_8);
        } catch (Exception e) {
            throw new EncryptionException("Decryption failed", e);
        }
    }

    // --- HMAC-SHA256 Signing ---------------------------------------------

    /**
     * Computes HMAC-SHA256 over data and returns Base64.
     * Used for integrity verification (e.g. refresh tokens).
     */
    public String hmacSign(String data) {
        try {
            Mac mac = Mac.getInstance(HMAC_ALGORITHM);
            mac.init(hmacKey);
            byte[] signature = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(signature);
        } catch (Exception e) {
            throw new EncryptionException("HMAC signing failed", e);
        }
    }

    public boolean hmacVerify(String data, String expectedBase64) {
        String actual = hmacSign(data);
        // Constant-time comparison to prevent timing attacks
        return MessageDigestUtils.constantTimeEquals(actual, expectedBase64);
    }

    // --- AES Key Generation (for per-device key) -------------------------

    /** Generates a fresh 256-bit AES key, returns it as Base64 string. */
    public String generateAesKeyBase64() {
        try {
            KeyGenerator kg = KeyGenerator.getInstance("AES");
            kg.init(256, secureRandom);
            return Base64.getEncoder().encodeToString(kg.generateKey().getEncoded());
        } catch (Exception e) {
            throw new EncryptionException("Key generation failed", e);
        }
    }

    // --- Utilities -------------------------------------------------------

    private static byte[] padTo32Bytes(byte[] input) {
        byte[] result = new byte[32];
        System.arraycopy(input, 0, result, 0, Math.min(input.length, 32));
        return result;
    }

    // --- Inner helper ----------------------------------------------------

    private static final class MessageDigestUtils {
        static boolean constantTimeEquals(String a, String b) {
            byte[] ab = a.getBytes(StandardCharsets.UTF_8);
            byte[] bb = b.getBytes(StandardCharsets.UTF_8);
            if (ab.length != bb.length) return false;
            int result = 0;
            for (int i = 0; i < ab.length; i++) result |= ab[i] ^ bb[i];
            return result == 0;
        }
    }

    public static class EncryptionException extends RuntimeException {
        public EncryptionException(String msg, Throwable cause) { super(msg, cause); }
    }
}
