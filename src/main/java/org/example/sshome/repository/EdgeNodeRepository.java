package org.example.sshome.repository;

import org.example.sshome.entity.EdgeNode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface EdgeNodeRepository extends JpaRepository<EdgeNode, UUID> {
    Optional<EdgeNode> findByNodeId(String nodeId);
    boolean existsByNodeId(String nodeId);
}
