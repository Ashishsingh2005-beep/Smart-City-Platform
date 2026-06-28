package com.smartcity.backend.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "complaints")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Complaint {
    
    @Id
    private String id;
    
    @Column(name = "tenant_id")
    private String tenantId = "Jaipur";
    
    @Column(name = "user_name")
    private String userName;
    
    private String subject;
    
    @Column(columnDefinition = "TEXT")
    private String description;
    
    private String category;
    
    private String priority;
    
    private String status;
    
    @Column(name = "assigned_to")
    private String assignedTo;
    
    private String location;
    
    @Column(name = "is_sla_breached")
    private Boolean isSlaBreached = false;
    
    @Column(name = "escalation_level")
    private Integer escalationLevel = 0;
    
    @Column(name = "sla_limit")
    private LocalDateTime slaLimit;
    
    @Column(name = "created_date")
    private LocalDateTime createdDate = LocalDateTime.now();
    
    private Double latitude;
    
    private Double longitude;
}
