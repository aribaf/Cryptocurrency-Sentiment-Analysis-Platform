// src/pages/Payments.jsx
import React, { useState } from "react";

export default function Payments() {
  const [billingType, setBillingType] = useState("monthly");
  const [paymentTab, setPaymentTab] = useState("crypto");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Subscription Plans</h1>
        <p className="text-gray-500 text-sm">
          Choose the plan that works best for you.
        </p>
      </div>

      {/* Billing toggle */}
      <div className="flex items-center justify-between">
        <div className="inline-flex items-center gap-2 rounded-full bg-gray-100 p-1 text-xs font-medium">
          <button
            onClick={() => setBillingType("monthly")}
            className={`px-3 py-1 rounded-full transition ${
              billingType === "monthly"
                ? "bg-white shadow-sm text-gray-900"
                : "text-gray-500"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingType("yearly")}
            className={`px-3 py-1 rounded-full transition ${
              billingType === "yearly"
                ? "bg-white shadow-sm text-gray-900"
                : "text-gray-500"
            }`}
          >
            Yearly
            <span className="ml-1 text-[10px] text-emerald-600 font-semibold">
              -20%
            </span>
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Plans */}
        <div className="lg:col-span-2 grid gap-5 md:grid-cols-3">
          {/* Basic */}
          <PlanCard
            label="Basic"
            sublabel="For individual users"
            price="$19.99"
            per="per month"
            features={[
              "Basic sentiment analysis",
              "Limited transaction tracking",
              "Basic trend predictions",
            ]}
            buttonLabel="Downgrade"
          />

          {/* Premium (Current) */}
          <PlanCard
            highlight
            label="Premium"
            tag="Current"
            sublabel="For serious traders"
            price="$49.99"
            per="per month"
            features={[
              "Advanced sentiment analysis",
              "Full transaction tracking",
              "Advanced trend predictions",
              "Real-time alerts",
            ]}
            buttonLabel="Current Plan"
            buttonVariant="primary"
          />

          {/* Enterprise */}
          <PlanCard
            label="Enterprise"
            sublabel="For organizations"
            price="$199.99"
            per="per month"
            features={[
              "All Premium features",
              "Custom API access",
              "Dedicated support",
              "Multiple user accounts",
            ]}
            buttonLabel="Upgrade"
          />
        </div>

        {/* Payment methods */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-gray-900">
            Payment Methods
          </h2>

          {/* Tabs */}
          <div className="flex rounded-lg bg-gray-100 p-1 text-xs font-medium">
            <button
              onClick={() => setPaymentTab("crypto")}
              className={`flex-1 py-1.5 rounded-md transition ${
                paymentTab === "crypto"
                  ? "bg-white shadow-sm text-gray-900"
                  : "text-gray-500"
              }`}
            >
              Crypto
            </button>
            <button
              onClick={() => setPaymentTab("card")}
              className={`flex-1 py-1.5 rounded-md transition ${
                paymentTab === "card"
                  ? "bg-white shadow-sm text-gray-900"
                  : "text-gray-500"
              }`}
            >
              Card
            </button>
          </div>

          {paymentTab === "crypto" ? (
            <div className="space-y-3 text-sm">
              <PaymentMethod
                name="Ethereum"
                short="ETH"
                isDefault
              />
              <PaymentMethod
                name="Bitcoin"
                short="BTC"
              />

              <button className="mt-1 inline-flex items-center justify-center w-full rounded-lg border border-dashed border-gray-300 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 transition">
                + Add Wallet
              </button>
            </div>
          ) : (
            <div className="space-y-3 text-sm">
              <PaymentMethod name="Visa ending in 4242" short="VISA" isDefault />
              <PaymentMethod name="Mastercard ending in 9012" short="MC" />
              <button className="mt-1 inline-flex items-center justify-center w-full rounded-lg border border-dashed border-gray-300 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 transition">
                + Add Card
              </button>
            </div>
          )}

          <p className="text-[11px] text-gray-400">
            All payments are processed securely. You can update or remove your
            payment methods at any time.
          </p>
        </div>
      </div>
    </div>
  );
}

/* Reusable components */

function PlanCard({
  highlight = false,
  label,
  tag,
  sublabel,
  price,
  per,
  features,
  buttonLabel,
  buttonVariant = "ghost",
}) {
  return (
    <div
      className={`relative flex flex-col rounded-2xl border p-5 text-sm transition shadow-sm ${
        highlight
          ? "border-indigo-500 bg-indigo-50/60"
          : "border-gray-200 bg-white hover:border-indigo-200"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">{label}</h3>
          <p className="text-xs text-gray-500">{sublabel}</p>
        </div>
        {tag && (
          <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-semibold text-white">
            {tag}
          </span>
        )}
      </div>

      <div className="mt-4">
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold text-gray-900">{price}</span>
          <span className="text-[11px] text-gray-500">{per}</span>
        </div>
      </div>

      <ul className="mt-4 space-y-1.5 text-xs text-gray-600">
        {features.map((item) => (
          <li key={item} className="flex items-start gap-2">
            <span className="mt-[2px] inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-100 text-[10px] text-emerald-700">
              ✓
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>

      <button
        className={`mt-5 w-full rounded-lg border px-3 py-2 text-xs font-medium transition ${
          buttonVariant === "primary"
            ? "border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-700"
            : "border-gray-300 text-gray-700 hover:bg-gray-50"
        }`}
      >
        {buttonLabel}
      </button>
    </div>
  );
}

function PaymentMethod({ name, short, isDefault = false }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 hover:bg-gray-50 transition">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-900 text-[10px] font-semibold text-white">
          {short}
        </div>
        <div>
          <p className="text-xs font-medium text-gray-900">{name}</p>
          {isDefault && (
            <p className="text-[11px] text-emerald-600 font-medium">
              Default
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
