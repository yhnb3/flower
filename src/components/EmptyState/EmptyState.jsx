import React from "react";
import { Archive } from "lucide-react";
import "./EmptyState.css";

export default function EmptyState({ title, description, variant = "default" }) {
  return (
    <div className={`empty-state empty-state--${variant}`} role="status">
      <Archive aria-hidden="true" size={28} />
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}
