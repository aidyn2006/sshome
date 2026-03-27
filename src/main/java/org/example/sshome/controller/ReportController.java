package org.example.sshome.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.example.sshome.entity.AuditLog;
import org.example.sshome.entity.User;
import org.example.sshome.service.AuditService;
import org.example.sshome.service.ReportService;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
@Tag(name = "Reports", description = "Report generation and export")
@SecurityRequirement(name = "bearerAuth")
public class ReportController {

    private final ReportService reportService;
    private final AuditService  auditService;

    /** GET /api/reports/export/pdf?type=UPTIME&days=7 */
    @GetMapping("/export/pdf")
    @PreAuthorize("hasAnyRole('OPERATOR','ADMIN','SUPERADMIN')")
    @Operation(summary = "Generate and download PDF report")
    public ResponseEntity<byte[]> exportPdf(
        @RequestParam(defaultValue = "UPTIME") String type,
        @RequestParam(defaultValue = "7")      int    days,
        @AuthenticationPrincipal User actor,
        HttpServletRequest http
    ) {
        Instant from = Instant.now().minus(days, ChronoUnit.DAYS);
        Instant to   = Instant.now();

        byte[] pdf = reportService.generatePdf(type, from, to);
        String filename = "sshome-" + type.toLowerCase() + "-report.pdf";

        auditService.log(AuditLog.Action.EXPORT, "REPORT", type, actor, http.getRemoteAddr(),
            Map.of("format", "PDF", "days", days));

        return ResponseEntity.ok()
            .contentType(MediaType.APPLICATION_PDF)
            .header(HttpHeaders.CONTENT_DISPOSITION,
                ContentDisposition.attachment().filename(filename).build().toString())
            .body(pdf);
    }

    /** GET /api/reports/export/xlsx?type=ALERTS&days=30 */
    @GetMapping("/export/xlsx")
    @PreAuthorize("hasAnyRole('OPERATOR','ADMIN','SUPERADMIN')")
    @Operation(summary = "Generate and download Excel report")
    public ResponseEntity<byte[]> exportExcel(
        @RequestParam(defaultValue = "UPTIME") String type,
        @RequestParam(defaultValue = "7")      int    days,
        @AuthenticationPrincipal User actor,
        HttpServletRequest http
    ) {
        Instant from = Instant.now().minus(days, ChronoUnit.DAYS);
        Instant to   = Instant.now();

        byte[] xlsx = reportService.generateExcel(type, from, to);
        String filename = "sshome-" + type.toLowerCase() + "-report.xlsx";

        auditService.log(AuditLog.Action.EXPORT, "REPORT", type, actor, http.getRemoteAddr(),
            Map.of("format", "XLSX", "days", days));

        return ResponseEntity.ok()
            .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
            .header(HttpHeaders.CONTENT_DISPOSITION,
                ContentDisposition.attachment().filename(filename).build().toString())
            .body(xlsx);
    }
}
