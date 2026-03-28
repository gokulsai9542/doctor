// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * MedAnnotate — On-chain annotation registry + payment escrow
 * Deploy on Polygon Amoy testnet (chainId: 80002)
 */
contract MedAnnotate {

    address public owner;

    // ── Structs ────────────────────────────────────────────────────────────────

    struct AnnotationRecord {
        string  annotationId;   // MongoDB ObjectId
        address doctorAddress;
        bytes32 dataHash;       // SHA-256 of annotation JSON
        string  ipfsHash;       // IPFS CID (optional)
        uint256 timestamp;
        bool    approved;
        bool    exists;
    }

    struct PaymentRecord {
        string  annotationId;
        address doctorAddress;
        uint256 amount;         // in wei
        bool    released;
        bool    exists;
    }

    struct DoctorReputation {
        uint256 totalAnnotations;
        uint256 approvedCount;
        uint256 rejectedCount;
        uint256 reputationScore; // (approved / total) * 100
        bool    exists;
    }

    // ── Storage ────────────────────────────────────────────────────────────────

    mapping(string => AnnotationRecord)  public annotations;
    mapping(string => PaymentRecord)     public payments;
    mapping(address => DoctorReputation) public reputations;

    // ── Events ─────────────────────────────────────────────────────────────────

    event AnnotationStored(
        string  indexed annotationId,
        address indexed doctorAddress,
        bytes32         dataHash,
        string          ipfsHash,
        uint256         timestamp
    );

    event AnnotationApproved(
        string  indexed annotationId,
        address indexed doctorAddress,
        uint256         timestamp
    );

    event AnnotationRejected(
        string  indexed annotationId,
        address indexed doctorAddress,
        uint256         timestamp
    );

    event PaymentDeposited(
        string  indexed annotationId,
        address indexed doctorAddress,
        uint256         amount
    );

    event PaymentReleased(
        string  indexed annotationId,
        address indexed doctorAddress,
        uint256         amount
    );

    event ReputationUpdated(
        address indexed doctorAddress,
        uint256         reputationScore
    );

    // ── Modifiers ──────────────────────────────────────────────────────────────

    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized");
        _;
    }

    modifier annotationExists(string memory annotationId) {
        require(annotations[annotationId].exists, "Annotation not found");
        _;
    }

    modifier notAlreadyStored(string memory annotationId) {
        require(!annotations[annotationId].exists, "Annotation already stored");
        _;
    }

    // ── Constructor ────────────────────────────────────────────────────────────

    constructor() {
        owner = msg.sender;
    }

    // ── Core Functions ─────────────────────────────────────────────────────────

    /**
     * Store annotation hash on-chain when doctor submits.
     * Called by backend (owner wallet) on behalf of doctor.
     */
    function storeAnnotation(
        string  memory annotationId,
        address        doctorAddress,
        bytes32        dataHash,
        string  memory ipfsHash
    ) external onlyOwner notAlreadyStored(annotationId) {
        annotations[annotationId] = AnnotationRecord({
            annotationId:  annotationId,
            doctorAddress: doctorAddress,
            dataHash:      dataHash,
            ipfsHash:      ipfsHash,
            timestamp:     block.timestamp,
            approved:      false,
            exists:        true
        });

        // Init reputation if first annotation
        if (!reputations[doctorAddress].exists) {
            reputations[doctorAddress] = DoctorReputation({
                totalAnnotations: 0,
                approvedCount:    0,
                rejectedCount:    0,
                reputationScore:  0,
                exists:           true
            });
        }
        reputations[doctorAddress].totalAnnotations++;
        _updateReputationScore(doctorAddress);

        emit AnnotationStored(annotationId, doctorAddress, dataHash, ipfsHash, block.timestamp);
    }

    /**
     * Approve annotation — marks it approved and releases escrowed payment.
     */
    function approveAnnotation(string memory annotationId)
        external
        onlyOwner
        annotationExists(annotationId)
    {
        AnnotationRecord storage ann = annotations[annotationId];
        require(!ann.approved, "Already approved");

        ann.approved = true;
        reputations[ann.doctorAddress].approvedCount++;
        _updateReputationScore(ann.doctorAddress);

        emit AnnotationApproved(annotationId, ann.doctorAddress, block.timestamp);
        emit ReputationUpdated(ann.doctorAddress, reputations[ann.doctorAddress].reputationScore);

        // Auto-release payment if escrowed
        if (payments[annotationId].exists && !payments[annotationId].released) {
            _releasePayment(annotationId);
        }
    }

    /**
     * Reject annotation — updates reputation score.
     */
    function rejectAnnotation(string memory annotationId)
        external
        onlyOwner
        annotationExists(annotationId)
    {
        AnnotationRecord storage ann = annotations[annotationId];
        reputations[ann.doctorAddress].rejectedCount++;
        _updateReputationScore(ann.doctorAddress);

        emit AnnotationRejected(annotationId, ann.doctorAddress, block.timestamp);
        emit ReputationUpdated(ann.doctorAddress, reputations[ann.doctorAddress].reputationScore);
    }

    /**
     * Deposit payment into escrow for a specific annotation.
     * Provider sends MATIC along with this call.
     */
    function depositPayment(string memory annotationId, address doctorAddress)
        external
        payable
        annotationExists(annotationId)
    {
        require(msg.value > 0, "Must send MATIC");
        require(!payments[annotationId].exists, "Payment already deposited");

        payments[annotationId] = PaymentRecord({
            annotationId:  annotationId,
            doctorAddress: doctorAddress,
            amount:        msg.value,
            released:      false,
            exists:        true
        });

        emit PaymentDeposited(annotationId, doctorAddress, msg.value);
    }

    /**
     * Manually release payment (if not auto-released on approval).
     */
    function releasePayment(string memory annotationId)
        external
        onlyOwner
        annotationExists(annotationId)
    {
        require(annotations[annotationId].approved, "Annotation not approved");
        require(payments[annotationId].exists, "No payment deposited");
        require(!payments[annotationId].released, "Already released");
        _releasePayment(annotationId);
    }

    // ── View Functions ─────────────────────────────────────────────────────────

    function getAnnotation(string memory annotationId)
        external
        view
        returns (AnnotationRecord memory)
    {
        return annotations[annotationId];
    }

    function getReputation(address doctorAddress)
        external
        view
        returns (DoctorReputation memory)
    {
        return reputations[doctorAddress];
    }

    function getPayment(string memory annotationId)
        external
        view
        returns (PaymentRecord memory)
    {
        return payments[annotationId];
    }

    function verifyAnnotation(string memory annotationId, bytes32 dataHash)
        external
        view
        returns (bool)
    {
        if (!annotations[annotationId].exists) return false;
        return annotations[annotationId].dataHash == dataHash;
    }

    // ── Internal ───────────────────────────────────────────────────────────────

    function _releasePayment(string memory annotationId) internal {
        PaymentRecord storage p = payments[annotationId];
        p.released = true;
        (bool sent, ) = payable(p.doctorAddress).call{ value: p.amount }("");
        require(sent, "Transfer failed");
        emit PaymentReleased(annotationId, p.doctorAddress, p.amount);
    }

    function _updateReputationScore(address doctorAddress) internal {
        DoctorReputation storage rep = reputations[doctorAddress];
        if (rep.totalAnnotations == 0) {
            rep.reputationScore = 0;
        } else {
            rep.reputationScore = (rep.approvedCount * 100) / rep.totalAnnotations;
        }
    }

    // Allow contract to receive MATIC
    receive() external payable {}
}
