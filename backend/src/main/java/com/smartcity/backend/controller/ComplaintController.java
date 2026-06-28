package com.smartcity.backend.controller;

import com.smartcity.backend.model.Complaint;
import com.smartcity.backend.model.AuditLog;
import com.smartcity.backend.repository.ComplaintRepository;
import com.smartcity.backend.repository.AuditLogRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import jakarta.servlet.http.HttpServletRequest;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/complaints")
@CrossOrigin(origins = "*", allowedHeaders = "*")
public class ComplaintController {

    @Autowired
    private ComplaintRepository complaintRepository;

    @Autowired
    private AuditLogRepository auditLogRepository;

    private void logAction(String username, String action, String targetId, String oldValue, String newValue, HttpServletRequest request) {
        AuditLog log = new AuditLog();
        log.setUsername(username != null ? username : "anonymous");
        log.setAction(action);
        log.setTargetId(targetId);
        log.setOldValue(oldValue);
        log.setNewValue(newValue);
        log.setIpAddress(request.getRemoteAddr());
        log.setUserAgent(request.getHeader("User-Agent"));
        auditLogRepository.save(log);
    }

    @GetMapping
    public List<Complaint> getAllComplaints(@RequestHeader(value = "X-Tenant-ID", defaultValue = "Jaipur") String tenantId) {
        return complaintRepository.findByTenantId(tenantId);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Complaint> getComplaintById(@PathVariable String id) {
        Optional<Complaint> complaint = complaintRepository.findById(id);
        return complaint.map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Complaint> createComplaint(@RequestBody Complaint complaint, HttpServletRequest request) {
        if (complaint.getId() == null) {
            long totalCount = complaintRepository.count();
            complaint.setId("#C-" + (1000 + totalCount + 1));
        }
        
        // Calculate SLA based on category
        int slaHours = 48; // default
        String category = complaint.getCategory();
        if ("Garbage & Sanitation".equalsIgnoreCase(category)) {
            slaHours = 24;
        } else if ("Water Supply".equalsIgnoreCase(category)) {
            slaHours = 12;
        } else if ("Electricity".equalsIgnoreCase(category)) {
            slaHours = 48;
        } else if ("Roads & Traffic".equalsIgnoreCase(category)) {
            slaHours = 168; // 7 days
        }
        
        complaint.setSlaLimit(LocalDateTime.now().plusHours(slaHours));
        complaint.setIsSlaBreached(false);
        complaint.setEscalationLevel(0);
        complaint.setCreatedDate(LocalDateTime.now());
        
        if (complaint.getStatus() == null) {
            complaint.setStatus("pending");
        }
        
        Complaint savedComplaint = complaintRepository.save(complaint);
        logAction(complaint.getUserName(), "CREATE_COMPLAINT", savedComplaint.getId(), null, savedComplaint.getSubject(), request);
        
        return ResponseEntity.ok(savedComplaint);
    }

    @PutMapping("/{id}/assign")
    public ResponseEntity<?> assignOfficer(@PathVariable String id, @RequestParam String officer, HttpServletRequest request) {
        Optional<Complaint> optionalComplaint = complaintRepository.findById(id);
        if (optionalComplaint.isPresent()) {
            Complaint complaint = optionalComplaint.get();
            String oldOfficer = complaint.getAssignedTo();
            complaint.setAssignedTo(officer);
            complaint.setStatus("assigned");
            complaintRepository.save(complaint);
            logAction("admin", "ASSIGN_OFFICER", id, oldOfficer, officer, request);
            return ResponseEntity.ok().body("{\"success\":true}");
        }
        return ResponseEntity.notFound().build();
    }

    @PutMapping("/{id}/priority")
    public ResponseEntity<?> updatePriority(@PathVariable String id, @RequestParam String priority, HttpServletRequest request) {
        Optional<Complaint> optionalComplaint = complaintRepository.findById(id);
        if (optionalComplaint.isPresent()) {
            Complaint complaint = optionalComplaint.get();
            String oldPriority = complaint.getPriority();
            complaint.setPriority(priority);
            complaintRepository.save(complaint);
            logAction("admin", "UPDATE_PRIORITY", id, oldPriority, priority, request);
            return ResponseEntity.ok().body("{\"success\":true}");
        }
        return ResponseEntity.notFound().build();
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<?> updateStatus(@PathVariable String id, @RequestParam String status, HttpServletRequest request) {
        Optional<Complaint> optionalComplaint = complaintRepository.findById(id);
        if (optionalComplaint.isPresent()) {
            Complaint complaint = optionalComplaint.get();
            String oldStatus = complaint.getStatus();
            complaint.setStatus(status);
            complaintRepository.save(complaint);
            logAction("admin", "UPDATE_STATUS", id, oldStatus, status, request);
            return ResponseEntity.ok().body("{\"success\":true}");
        }
        return ResponseEntity.notFound().build();
    }
}
