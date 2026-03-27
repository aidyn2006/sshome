package org.example.sshome.repository;

import org.example.sshome.entity.EdgeNode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface EdgeNodeRepository extends JpaRepository<EdgeNode, UUID> {
    Optional<EdgeNode> findByNodeId(String nodeId);
    boolean existsByNodeId(String nodeId);

    /** Eagerly fetch devices to avoid LazyInitializationException in controllers */
    @Query("SELECT n FROM EdgeNode n LEFT JOIN FETCH n.devices WHERE n.id = :id")
    Optional<EdgeNode> findByIdWithDevices(@Param("id") UUID id);
}
