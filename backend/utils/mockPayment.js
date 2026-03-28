// Simulates a payment gateway — generates fake transaction IDs and random success/failure

const generateTransactionId = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const random = Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `TXN-${random}`;
};

// Simulates network delay + 90% success rate
const processPayment = ({ amount, doctorName, note }) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const success = Math.random() > 0.1; // 90% success
      if (success) {
        resolve({
          success: true,
          transactionId: generateTransactionId(),
          message: `Payment of ₹${amount} to ${doctorName} processed successfully`,
          processedAt: new Date(),
        });
      } else {
        resolve({
          success: false,
          transactionId: null,
          message: 'Payment failed due to network error. Please retry.',
          processedAt: new Date(),
        });
      }
    }, 1500); // simulate 1.5s processing delay
  });
};

module.exports = { processPayment, generateTransactionId };
