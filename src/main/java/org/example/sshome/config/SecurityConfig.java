package org.example.sshome.config;

import lombok.RequiredArgsConstructor;
import org.example.sshome.filter.JwtRateLimitFilter;
import org.example.sshome.security.JwtAuthenticationFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableMethodSecurity(prePostEnabled = true)
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthFilter;
    private final JwtRateLimitFilter      rateLimitFilter;
    private final UserDetailsService      userDetailsService;

    private static final String[] PUBLIC_PATHS = {
        "/auth/**",
        "/h2-console/**",
        "/actuator/health",
        "/api-docs/**",
        "/swagger-ui/**",
        "/swagger-ui.html",
        "/ws/**",           // WebSocket handshake
        "/ws-native/**"
    };

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            // --- CSRF: disabled (stateless JWT API) ---------------------
            .csrf(AbstractHttpConfigurer::disable)

            // --- CORS ----------------------------------------------------
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))

            // --- Sessions: stateless -------------------------------------
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

            // --- Security Headers -----------------------------------------
            .headers(headers -> headers
                .frameOptions(frame -> frame.sameOrigin())          // H2 console
                .xssProtection(xss -> xss.disable())               // Let browser handle
                .contentSecurityPolicy(csp -> csp
                    .policyDirectives("default-src 'self'; frame-ancestors 'self'"))
                .referrerPolicy(ref -> ref
                    .policy(ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN))
            )

            // --- Authorization --------------------------------------------
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(PUBLIC_PATHS).permitAll()
                // SSE endpoints are authenticated via token query param
                .requestMatchers("/monitoring/stream/**").authenticated()
                // Read-only data endpoints require at least VIEWER role
                .requestMatchers(HttpMethod.GET, "/api/devices/**").hasAnyRole("VIEWER","OPERATOR","ADMIN","SUPERADMIN")
                .requestMatchers(HttpMethod.GET, "/api/alerts/**").hasAnyRole("VIEWER","OPERATOR","ADMIN","SUPERADMIN")
                .requestMatchers(HttpMethod.GET, "/api/overview/**").hasAnyRole("VIEWER","OPERATOR","ADMIN","SUPERADMIN")
                .requestMatchers(HttpMethod.GET, "/api/alert-rules/**").hasAnyRole("VIEWER","OPERATOR","ADMIN","SUPERADMIN")
                .requestMatchers(HttpMethod.GET, "/api/edge-nodes/**").hasAnyRole("VIEWER","OPERATOR","ADMIN","SUPERADMIN")
                // Mutations require OPERATOR or above
                .requestMatchers(HttpMethod.POST, "/api/devices/**").hasAnyRole("OPERATOR","ADMIN","SUPERADMIN")
                .requestMatchers(HttpMethod.PUT,  "/api/devices/**").hasAnyRole("OPERATOR","ADMIN","SUPERADMIN")
                .requestMatchers(HttpMethod.DELETE,"/api/devices/**").hasAnyRole("ADMIN","SUPERADMIN")
                // Admin-only endpoints
                .requestMatchers("/api/settings/users/**").hasAnyRole("ADMIN","SUPERADMIN")
                .requestMatchers("/api/audit/**").hasAnyRole("ADMIN","SUPERADMIN")
                .anyRequest().authenticated()
            )

            // --- Filters --------------------------------------------------
            .authenticationProvider(authenticationProvider())
            .addFilterBefore(rateLimitFilter,   UsernamePasswordAuthenticationFilter.class)
            .addFilterBefore(jwtAuthFilter,     UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOriginPatterns(List.of("*"));
        config.setAllowedMethods(List.of("GET","POST","PUT","PATCH","DELETE","OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setExposedHeaders(List.of("Authorization", "X-Total-Count"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    @Bean
    public AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
        provider.setUserDetailsService(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder());
        return provider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);  // strength 12 for prod
    }
}
