import React from "react";
import { SignInButton, SignUpButton } from "@clerk/react";
import { Cloud, LogIn, UserPlus } from "lucide-react";
import PageState from "../PageState/PageState.jsx";
import "./SignedOutState.css";

export default function SignedOutState() {
  return (
    <PageState
      icon={Cloud}
      title="花 Planner"
      description="계정을 만들거나 로그인하면 할 일과 메모가 기기 간에 안전하게 동기화됩니다."
      action={
        <div className="auth-actions">
          <SignUpButton mode="modal">
            <button className="auth-button auth-primary-button" type="button">
              <UserPlus aria-hidden="true" size={18} />
              계정 만들기
            </button>
          </SignUpButton>
          <SignInButton mode="modal">
            <button className="auth-button auth-secondary-button" type="button">
              <LogIn aria-hidden="true" size={18} />
              로그인
            </button>
          </SignInButton>
        </div>
      }
    />
  );
}
