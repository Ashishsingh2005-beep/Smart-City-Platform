package com.smartcity.backend.repository;

import com.smartcity.backend.model.Complaint;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ComplaintRepository extends JpaRepository<Complaint, String> {
    List<Complaint> findByTenantId(String tenantId);
    List<Complaint> findByCategory(String category);
    List<Complaint> findByStatus(String status);
    List<Complaint> findByIsSlaBreached(Boolean isSlaBreached);
}
