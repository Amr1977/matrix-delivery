import React, { useState } from "react";
import ReCAPTCHA from "react-google-recaptcha";
import { useI18n } from "../../i18n/i18nContext";

const RegisterForm = ({ onSubmit, loading, error, t, countries }) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    primary_role: "customer",
    vehicle_type: "",
    country: "",
    city: "",
    area: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [captchaRef, setCaptchaRef] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (
      !formData.name ||
      !formData.email ||
      !formData.password ||
      !formData.phone ||
      !formData.primary_role ||
      !formData.country ||
      !formData.city ||
      !formData.area
    ) {
      return;
    }
    if (formData.primary_role === "driver" && !formData.vehicle_type) {
      return;
    }

    const recaptchaToken =
      process.env.REACT_APP_RECAPTCHA_SITE_KEY && captchaRef?.getValue();
    if (process.env.REACT_APP_RECAPTCHA_SITE_KEY && !recaptchaToken) {
      return;
    }

    await onSubmit({
      ...formData,
      primary_role: formData.primary_role,
      recaptchaToken,
    });
  };

  return (
    <>
      <h2 style={{ fontSize: "1.25rem", fontWeight: "bold", color: "#1F2937" }}>
        {t("auth.createAccount")}
      </h2>
      <input
        type="text"
        data-testid="name-input"
        placeholder={t("auth.fullName")}
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        style={{
          width: "100%",
          padding: "0.5rem 1rem",
          border: "1px solid #D1D5DB",
          borderRadius: "0.5rem",
          outline: "none",
        }}
      />
      <input
        type="email"
        data-testid="email-input"
        placeholder={t("auth.email")}
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        style={{
          width: "100%",
          padding: "0.5rem 1rem",
          border: "1px solid #D1D5DB",
          borderRadius: "0.5rem",
          outline: "none",
        }}
      />
      <input
        type="tel"
        data-testid="phone-input"
        placeholder={t("auth.phoneNumber")}
        value={formData.phone}
        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
        style={{
          width: "100%",
          padding: "0.5rem 1rem",
          border: "1px solid #D1D5DB",
          borderRadius: "0.5rem",
          outline: "none",
        }}
      />
      <div style={{ position: "relative" }}>
        <input
          type={showPassword ? "text" : "password"}
          data-testid="password-input"
          placeholder={t("auth.password")}
          value={formData.password}
          onChange={(e) =>
            setFormData({ ...formData, password: e.target.value })
          }
          style={{
            width: "100%",
            padding: "0.5rem 2.5rem 0.5rem 1rem",
            border: "1px solid #D1D5DB",
            borderRadius: "0.5rem",
            outline: "none",
            boxSizing: "border-box",
          }}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          data-testid="toggle-password-visibility"
          aria-label={showPassword ? "Hide password" : "Show password"}
          style={{
            position: "absolute",
            right: "0",
            top: "0",
            bottom: "0",
            width: "2.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "none",
            border: "none",
            color: "#6B7280",
            cursor: "pointer",
            padding: 0,
          }}
        >
          {showPassword ? (
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          ) : (
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </div>
      <select
        value={formData.primary_role}
        data-testid="role-select"
        onChange={(e) =>
          setFormData({
            ...formData,
            primary_role: e.target.value,
            vehicle_type:
              e.target.value === "customer" ? "" : formData.vehicle_type,
          })
        }
        style={{
          width: "100%",
          padding: "0.5rem 1rem",
          border: "1px solid #D1D5DB",
          borderRadius: "0.5rem",
          outline: "none",
        }}
      >
        <option value="customer">{t("auth.customer")}</option>
        <option value="driver">{t("auth.driver")}</option>
      </select>
      {formData.primary_role === "driver" && (
        <select
          value={formData.vehicle_type}
          data-testid="vehicle-select"
          onChange={(e) =>
            setFormData({ ...formData, vehicle_type: e.target.value })
          }
          style={{
            width: "100%",
            padding: "0.5rem 1rem",
            border: "1px solid #D1D5DB",
            borderRadius: "0.5rem",
            outline: "none",
          }}
        >
          <option value="">{t("auth.selectVehicleType")}</option>
          <option value="walker">{t("auth.walker")}</option>
          <option value="bicycle">{t("auth.bicycle")}</option>
          <option value="bike">{t("auth.bike")}</option>
          <option value="car">{t("auth.car")}</option>
          <option value="van">{t("auth.van")}</option>
          <option value="truck">{t("auth.truck")}</option>
        </select>
      )}

      {/* Location Fields */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "0.5rem",
        }}
      >
        <input
          type="text"
          data-testid="country-input"
          placeholder={t("orders.selectCountry")}
          value={formData.country}
          onChange={(e) =>
            setFormData({ ...formData, country: e.target.value })
          }
          style={{
            width: "100%",
            padding: "0.5rem 1rem",
            border: "1px solid #D1D5DB",
            borderRadius: "0.5rem",
            outline: "none",
          }}
        />
        <input
          type="text"
          data-testid="city-input"
          placeholder={t("orders.city")}
          value={formData.city}
          onChange={(e) => setFormData({ ...formData, city: e.target.value })}
          style={{
            width: "100%",
            padding: "0.5rem 1rem",
            border: "1px solid #D1D5DB",
            borderRadius: "0.5rem",
            outline: "none",
          }}
        />
      </div>
      <input
        type="text"
        data-testid="area-input"
        placeholder={t("orders.area")}
        value={formData.area}
        onChange={(e) => setFormData({ ...formData, area: e.target.value })}
        style={{
          width: "100%",
          padding: "0.5rem 1rem",
          border: "1px solid #D1D5DB",
          borderRadius: "0.5rem",
          outline: "none",
        }}
      />
      {process.env.REACT_APP_RECAPTCHA_SITE_KEY && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginTop: "1rem",
          }}
        >
          <ReCAPTCHA
            ref={(ref) => setCaptchaRef(ref)}
            sitekey={process.env.REACT_APP_RECAPTCHA_SITE_KEY}
          />
        </div>
      )}
      <button
        onClick={handleSubmit}
        data-testid="register-submit-btn"
        disabled={loading}
        style={{
          width: "100%",
          background: "#4F46E5",
          color: "white",
          padding: "0.5rem",
          borderRadius: "0.5rem",
          fontWeight: "600",
          border: "none",
          cursor: "pointer",
          opacity: loading ? 0.5 : 1,
        }}
      >
        {loading ? t("auth.loading") : t("auth.register")}
      </button>
    </>
  );
};

export default RegisterForm;
