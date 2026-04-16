import React from "react";
import LegalLayout from "./LegalLayout";

interface PrivacyPolicyProps {
  onBack: () => void;
}

const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({ onBack }) => {
  return (
    <LegalLayout
      title="Privacy Policy"
      lastUpdated="December 5, 2025"
      onBack={onBack}
    >
      <section style={{ marginBottom: "1.5rem" }}>
        <h2
          style={{ color: "white", fontSize: "1.25rem", marginBottom: "1rem" }}
        >
          1. Introduction
        </h2>
        <p>
          Welcome to Matrix Delivery. We respect your privacy and are committed
          to protecting your personal data. This privacy policy will inform you
          as to how we look after your personal data when you visit our website
          (regardless of where you visit it from) or use our mobile application
          and tell you about your privacy rights and how the law protects you.
        </p>
      </section>

      <section style={{ marginBottom: "1.5rem" }}>
        <h2
          style={{ color: "white", fontSize: "1.25rem", marginBottom: "1rem" }}
        >
          2. data We Collect
        </h2>
        <p>
          We may collect, use, store and transfer different kinds of personal
          data about you which we have grouped together follows:
        </p>
        <ul
          style={{
            listStyleType: "disc",
            paddingLeft: "1.5rem",
            marginTop: "0.5rem",
          }}
        >
          <li>
            <strong>Identity Data</strong> includes first name, last name,
            username or similar identifier.
          </li>
          <li>
            <strong>Contact Data</strong> includes billing address, delivery
            address, email address and telephone numbers.
          </li>
          <li>
            <strong>Financial Data</strong> includes bank account and payment
            card details (processed securely by our payment providers).
          </li>
          <li>
            <strong>Transaction Data</strong> includes details about payments to
            and from you and other details of products and services you have
            purchased from us.
          </li>
          <li>
            <strong>Technical Data</strong> includes internet protocol (IP)
            address, your login data, browser type and version, time zone
            setting and location, browser plug-in types and versions, operating
            system and platform and other technology on the devices you use to
            access this website.
          </li>
          <li>
            <strong>Location Data</strong> includes your realtime GPS location
            data when using our app to track deliveries or provide delivery
            services.
          </li>
        </ul>
      </section>

      <section style={{ marginBottom: "1.5rem" }}>
        <h2
          style={{ color: "white", fontSize: "1.25rem", marginBottom: "1rem" }}
        >
          3. How We Use Your Data
        </h2>
        <p>
          We will only use your personal data when the law allows us to. Most
          commonly, we will use your personal data in the following
          circumstances:
        </p>
        <ul
          style={{
            listStyleType: "disc",
            paddingLeft: "1.5rem",
            marginTop: "0.5rem",
          }}
        >
          <li>
            Where we need to perform the contract we are about to enter into or
            have entered into with you.
          </li>
          <li>
            Where it is necessary for our legitimate interests (or those of a
            third party) and your interests and fundamental rights do not
            override those interests.
          </li>
          <li>
            Where we need to comply with a legal or regulatory obligation.
          </li>
        </ul>
      </section>

      <section style={{ marginBottom: "1.5rem" }}>
        <h2
          style={{ color: "white", fontSize: "1.25rem", marginBottom: "1rem" }}
        >
          4. Data Security
        </h2>
        <p>
          We have put in place appropriate security measures to prevent your
          personal data from being accidentally lost, used or accessed in an
          unauthorized way, altered or disclosed. In addition, we limit access
          to your personal data to those employees, agents, contractors and
          other third parties who have a business need to know.
        </p>
      </section>

      <section style={{ marginBottom: "1.5rem" }}>
        <h2
          style={{ color: "white", fontSize: "1.25rem", marginBottom: "1rem" }}
        >
          5. Contact Details
        </h2>
        <p>
          If you have any questions about this privacy policy or our privacy
          practices, please contact us at:
        </p>
        <p style={{ marginTop: "0.5rem" }}>
          Email: privacy@matrix-delivery.com
          <br />
          Phone: +201094450141
        </p>
      </section>
    </LegalLayout>
  );
};

export default PrivacyPolicy;
