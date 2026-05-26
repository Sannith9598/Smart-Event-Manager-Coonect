import { motion } from "framer-motion";

const steps = [
  { label: "Select Event", icon: "🎉" },
  { label: "Customize", icon: "✨" },
  { label: "Review", icon: "📋" },
  { label: "Confirm", icon: "✅" },
];

// Renders the multi-step progress indicator for the booking flow
export default function BookingStepper({ currentStep = 0 }) {
  return (
    <div className="booking-stepper">
      {steps.map((step, index) => (
        <div key={index} className="stepper-item">
          <motion.div
            className={`stepper-circle ${index <= currentStep ? "active" : ""} ${index < currentStep ? "completed" : ""}`}
            initial={false}
            animate={{
              scale: index === currentStep ? 1.1 : 1,
              backgroundColor: index <= currentStep ? "#6366f1" : "#e2e8f0",
            }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            {index < currentStep ? "✓" : step.icon}
          </motion.div>
          <span className={`stepper-label ${index <= currentStep ? "active" : ""}`}>
            {step.label}
          </span>
          {index < steps.length - 1 && (
            <div className={`stepper-line ${index < currentStep ? "active" : ""}`} />
          )}
        </div>
      ))}
    </div>
  );
}
