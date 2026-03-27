package org.example.sshome.service;

import com.lowagie.text.Chunk;
import com.lowagie.text.Document;
import com.lowagie.text.DocumentException;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.pdf.PdfWriter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.example.sshome.entity.*;
import org.example.sshome.repository.AlertRepository;
import org.example.sshome.repository.AuditLogRepository;
import org.example.sshome.repository.DeviceRepository;
import org.example.sshome.repository.SensorReadingRepository;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class ReportService {

    private final DeviceRepository       deviceRepository;
    private final AlertRepository        alertRepository;
    private final SensorReadingRepository readingRepository;
    private final AuditLogRepository     auditLogRepository;
    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")
        .withZone(ZoneId.systemDefault());

    // --- PDF Generation ---------------------------------------------------

    public byte[] generatePdf(String type, Instant from, Instant to) {
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            Document doc = new Document(PageSize.A4, 50, 50, 60, 50);
            PdfWriter.getInstance(doc, baos);
            doc.open();

            // -- Header ----------------------------------------------------
            com.lowagie.text.Font titleFont  = new com.lowagie.text.Font(com.lowagie.text.Font.HELVETICA, 18, com.lowagie.text.Font.BOLD);
            com.lowagie.text.Font headerFont = new com.lowagie.text.Font(com.lowagie.text.Font.HELVETICA, 12, com.lowagie.text.Font.BOLD);
            com.lowagie.text.Font normalFont = new com.lowagie.text.Font(com.lowagie.text.Font.HELVETICA, 10, com.lowagie.text.Font.NORMAL);
            com.lowagie.text.Font smallFont  = new com.lowagie.text.Font(com.lowagie.text.Font.HELVETICA, 9, com.lowagie.text.Font.ITALIC);

            doc.add(new Paragraph("SSHome - " + reportTitle(type), titleFont));
            doc.add(new Paragraph("Period: " + FMT.format(from) + " -> " + FMT.format(to), smallFont));
            doc.add(new Paragraph("Generated: " + FMT.format(Instant.now()), smallFont));
            doc.add(Chunk.NEWLINE);

            switch (type.toUpperCase()) {
                case "UPTIME"   -> buildUptimeSection(doc, headerFont, normalFont, from, to);
                case "ALERTS"   -> buildAlertsSection(doc, headerFont, normalFont, from, to);
                case "SENSORS"  -> buildSensorsSection(doc, headerFont, normalFont, from, to);
                case "ACTIVITY" -> buildActivitySection(doc, headerFont, normalFont, from, to);
                default         -> doc.add(new Paragraph("Report type not implemented: " + type));
            }

            doc.close();
            return baos.toByteArray();
        } catch (Exception e) {
            log.error("PDF generation failed: type={}", type, e);
            throw new RuntimeException("Failed to generate PDF report", e);
        }
    }

    private void buildUptimeSection(Document doc, com.lowagie.text.Font hdr, com.lowagie.text.Font normal,
                                    Instant from, Instant to) throws DocumentException {
        doc.add(new Paragraph("Device Uptime Summary", hdr));
        doc.add(Chunk.NEWLINE);

        List<Device> devices = deviceRepository.findAll();
        long total = devices.size();
        long online = devices.stream().filter(d -> d.getStatus() == Device.DeviceStatus.ONLINE).count();

        doc.add(new Paragraph("Total Devices: " + total, normal));
        doc.add(new Paragraph("Currently Online: " + online, normal));
        doc.add(new Paragraph("Uptime: " + (total > 0 ? String.format("%.1f%%", 100.0 * online / total) : "N/A"), normal));
        doc.add(Chunk.NEWLINE);

        // Device list table
        com.lowagie.text.pdf.PdfPTable table = new com.lowagie.text.pdf.PdfPTable(4);
        table.setWidthPercentage(100);
        table.setWidths(new float[]{3f, 2f, 2f, 1.5f});
        addTableHeader(table, hdr, "Device Name", "Type", "Location", "Status");
        for (Device d : devices) {
            addTableCell(table, normal, d.getName());
            addTableCell(table, normal, d.getType().name());
            addTableCell(table, normal, d.getLocation() != null ? d.getLocation() : "-");
            addTableCell(table, normal, d.getStatus().name());
        }
        doc.add(table);
    }

    private void buildAlertsSection(Document doc, com.lowagie.text.Font hdr, com.lowagie.text.Font normal,
                                    Instant from, Instant to) throws DocumentException {
        doc.add(new Paragraph("Alert Summary", hdr));
        doc.add(Chunk.NEWLINE);

        List<Alert> alerts = alertRepository.findByTimeRange(from, to);
        long critical = alerts.stream().filter(a -> a.getSeverity() == Alert.Severity.CRITICAL).count();
        long warning  = alerts.stream().filter(a -> a.getSeverity() == Alert.Severity.WARNING).count();
        long info     = alerts.stream().filter(a -> a.getSeverity() == Alert.Severity.INFO).count();

        doc.add(new Paragraph("Total Alerts: " + alerts.size(), normal));
        doc.add(new Paragraph("Critical: " + critical + "  Warning: " + warning + "  Info: " + info, normal));
        doc.add(Chunk.NEWLINE);

        com.lowagie.text.pdf.PdfPTable table = new com.lowagie.text.pdf.PdfPTable(4);
        table.setWidthPercentage(100);
        addTableHeader(table, hdr, "Time", "Severity", "Device", "Message");
        for (Alert a : alerts.stream().limit(100).toList()) {
            addTableCell(table, normal, FMT.format(a.getCreatedAt()));
            addTableCell(table, normal, a.getSeverity().name());
            addTableCell(table, normal, a.getDevice() != null ? a.getDevice().getName() : "-");
            addTableCell(table, normal, truncate(a.getMessage(), 80));
        }
        doc.add(table);
    }

    private void buildSensorsSection(Document doc, com.lowagie.text.Font hdr, com.lowagie.text.Font normal,
                                     Instant from, Instant to) throws DocumentException {
        doc.add(new Paragraph("Sensor Analytics", hdr));
        doc.add(Chunk.NEWLINE);
        doc.add(new Paragraph("Min/Max/Avg values per channel across all devices.", normal));
        doc.add(Chunk.NEWLINE);
        // Full implementation: query aggregateByChannelAndPeriod per device
        doc.add(new Paragraph("See Excel export for detailed per-device data.", normal));
    }

    private void buildActivitySection(Document doc, com.lowagie.text.Font hdr, com.lowagie.text.Font normal,
                                      Instant from, Instant to) throws DocumentException {
        doc.add(new Paragraph("User Activity Report", hdr));
        doc.add(Chunk.NEWLINE);
        List<Object[]> rows = auditLogRepository.countPerUserSince(from);
        com.lowagie.text.pdf.PdfPTable table = new com.lowagie.text.pdf.PdfPTable(2);
        table.setWidthPercentage(60);
        addTableHeader(table, hdr, "User Email", "Actions");
        for (Object[] row : rows) {
            addTableCell(table, normal, row[0] != null ? row[0].toString() : "anonymous");
            addTableCell(table, normal, row[1] != null ? row[1].toString() : "0");
        }
        doc.add(table);
    }

    // --- Excel Generation -------------------------------------------------

    public byte[] generateExcel(String type, Instant from, Instant to) {
        try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            Sheet sheet = wb.createSheet(reportTitle(type));

            CellStyle headerStyle = wb.createCellStyle();
            org.apache.poi.ss.usermodel.Font bold = wb.createFont();
            bold.setBold(true);
            headerStyle.setFont(bold);
            headerStyle.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

            switch (type.toUpperCase()) {
                case "UPTIME"   -> buildUptimeSheet(sheet, headerStyle, from, to);
                case "ALERTS"   -> buildAlertsSheet(sheet, headerStyle, from, to);
                case "SENSORS"  -> buildSensorsSheet(sheet, headerStyle, from, to);
                case "ACTIVITY" -> buildActivitySheet(sheet, headerStyle, from);
                default -> {
                    Row r = sheet.createRow(0);
                    r.createCell(0).setCellValue("Report type not implemented: " + type);
                }
            }

            // Auto-size columns
            Row firstRow = sheet.getRow(0);
            if (firstRow != null) {
                for (int i = 0; i < firstRow.getLastCellNum(); i++) sheet.autoSizeColumn(i);
            }

            wb.write(baos);
            return baos.toByteArray();
        } catch (Exception e) {
            log.error("Excel generation failed: type={}", type, e);
            throw new RuntimeException("Failed to generate Excel report", e);
        }
    }

    private void buildUptimeSheet(Sheet sheet, CellStyle hStyle, Instant from, Instant to) {
        String[] headers = {"Device ID", "Name", "Type", "Location", "Status", "Firmware", "Last Seen"};
        createHeaderRow(sheet, hStyle, headers);
        int rowNum = 1;
        for (Device d : deviceRepository.findAll()) {
            Row row = sheet.createRow(rowNum++);
            row.createCell(0).setCellValue(d.getDeviceId());
            row.createCell(1).setCellValue(d.getName());
            row.createCell(2).setCellValue(d.getType().name());
            row.createCell(3).setCellValue(d.getLocation() != null ? d.getLocation() : "");
            row.createCell(4).setCellValue(d.getStatus().name());
            row.createCell(5).setCellValue(d.getFirmware() != null ? d.getFirmware() : "");
            row.createCell(6).setCellValue(d.getLastSeenAt() != null ? FMT.format(d.getLastSeenAt()) : "Never");
        }
    }

    private void buildAlertsSheet(Sheet sheet, CellStyle hStyle, Instant from, Instant to) {
        createHeaderRow(sheet, hStyle, "Time", "Severity", "Status", "Device", "Message");
        int rowNum = 1;
        for (Alert a : alertRepository.findByTimeRange(from, to)) {
            Row row = sheet.createRow(rowNum++);
            row.createCell(0).setCellValue(FMT.format(a.getCreatedAt()));
            row.createCell(1).setCellValue(a.getSeverity().name());
            row.createCell(2).setCellValue(a.getStatus().name());
            row.createCell(3).setCellValue(a.getDevice() != null ? a.getDevice().getName() : "");
            row.createCell(4).setCellValue(a.getMessage());
        }
    }

    private void buildSensorsSheet(Sheet sheet, CellStyle hStyle, Instant from, Instant to) {
        createHeaderRow(sheet, hStyle, "Device ID", "Device Name", "Channel", "Value", "Unit", "Read At");
        int rowNum = 1;
        for (SensorReading r : readingRepository.findByTimeRange(from, to)) {
            Row row = sheet.createRow(rowNum++);
            row.createCell(0).setCellValue(r.getDevice().getDeviceId());
            row.createCell(1).setCellValue(r.getDevice().getName());
            row.createCell(2).setCellValue(r.getChannel());
            row.createCell(3).setCellValue(r.getValue());
            row.createCell(4).setCellValue(r.getUnit() != null ? r.getUnit() : "");
            row.createCell(5).setCellValue(FMT.format(r.getReadAt()));
        }
    }

    private void buildActivitySheet(Sheet sheet, CellStyle hStyle, Instant from) {
        createHeaderRow(sheet, hStyle, "User Email", "Actions");
        int rowNum = 1;
        for (Object[] row : auditLogRepository.countPerUserSince(from)) {
            Row r = sheet.createRow(rowNum++);
            r.createCell(0).setCellValue(row[0] != null ? row[0].toString() : "anonymous");
            r.createCell(1).setCellValue(row[1] != null ? Long.parseLong(row[1].toString()) : 0);
        }
    }

    // --- Helpers ---------------------------------------------------------

    private String reportTitle(String type) {
        return switch (type.toUpperCase()) {
            case "UPTIME"   -> "Device Uptime Report";
            case "ALERTS"   -> "Alert Summary Report";
            case "SENSORS"  -> "Sensor Analytics Report";
            case "ACTIVITY" -> "User Activity Report";
            case "ENERGY"   -> "Energy Consumption Report";
            default         -> "SSHome Report";
        };
    }

    private void addTableHeader(com.lowagie.text.pdf.PdfPTable table, com.lowagie.text.Font f, String... headers) {
        for (String h : headers) {
            com.lowagie.text.pdf.PdfPCell cell = new com.lowagie.text.pdf.PdfPCell(new Phrase(h, f));
            cell.setBackgroundColor(java.awt.Color.LIGHT_GRAY);
            cell.setPadding(5);
            table.addCell(cell);
        }
    }

    private void addTableCell(com.lowagie.text.pdf.PdfPTable table, com.lowagie.text.Font f, String value) {
        com.lowagie.text.pdf.PdfPCell cell = new com.lowagie.text.pdf.PdfPCell(new Phrase(value, f));
        cell.setPadding(4);
        table.addCell(cell);
    }

    private void createHeaderRow(Sheet sheet, CellStyle style, String... headers) {
        Row row = sheet.createRow(0);
        for (int i = 0; i < headers.length; i++) {
            Cell cell = row.createCell(i);
            cell.setCellValue(headers[i]);
            cell.setCellStyle(style);
        }
    }

    private String truncate(String s, int max) {
        return s.length() <= max ? s : s.substring(0, max) + "…";
    }
}
