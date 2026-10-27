"use client";

import { useState, useEffect } from "react";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";

interface MetaAdsModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultVerifyToken?: string;
}

export default function MetaAdsModal({
  isOpen,
  onClose,
  defaultVerifyToken = "fx_meta_leads_token_2026",
}: MetaAdsModalProps) {
  useBodyScrollLock(isOpen);

  const [origin, setOrigin] = useState("");
  const [activeTab, setActiveTab] = useState<"setup" | "distribution" | "simulator">("setup");
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);

  // Integration settings state
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [pageAccessToken, setPageAccessToken] = useState("");
  const [verifyToken, setVerifyToken] = useState(defaultVerifyToken);
  const [hasPageAccessToken, setHasPageAccessToken] = useState(false);
  const [pageAccessTokenMasked, setPageAccessTokenMasked] = useState("");
  const [counselors, setCounselors] = useState<any[]>([]);
  const [distributionMode, setDistributionMode] = useState("");
  const [savingToken, setSavingToken] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Test Simulator State
  const [simName, setSimName] = useState("Aman Sharma");
  const [simPhone, setSimPhone] = useState("+91 98123 45678");
  const [simEmail, setSimEmail] = useState("aman.sharma@example.com");
  const [simState, setSimState] = useState("Rajasthan");
  const [simCity, setSimCity] = useState("Jaipur");
  const [simNeet, setSimNeet] = useState("Qualified (450)");
  const [simCountry, setSimCountry] = useState("Russia");
  const [simCampaign, setSimCampaign] = useState("State-wise");
  const [simLoading, setSimLoading] = useState(false);
  const [simResult, setSimResult] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchConfig();
    }
  }, [isOpen]);

  async function fetchConfig() {
    try {
      setLoadingConfig(true);
      const res = await fetch("/api/admin/integrations/meta-ads");
      const data = await res.json();
      if (res.ok) {
        setHasPageAccessToken(data.hasPageAccessToken);
        setPageAccessTokenMasked(data.pageAccessTokenMasked || "");
        if (data.verifyToken) setVerifyToken(data.verifyToken);
        setCounselors(data.counselors || []);
        setDistributionMode(data.distributionMode || "");
      }
    } catch (err) {
      console.error("Failed to load Meta Ads config:", err);
    } finally {
      setLoadingConfig(false);
    }
  }

  async function handleSaveToken() {
    if (!pageAccessToken.trim()) return;
    try {
      setSavingToken(true);
      setSaveSuccess(false);
      const res = await fetch("/api/admin/integrations/meta-ads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metaPageAccessToken: pageAccessToken.trim(),
          metaVerifyToken: verifyToken.trim(),
        }),
      });
      if (res.ok) {
        setSaveSuccess(true);
        setPageAccessToken("");
        await fetchConfig();
        setTimeout(() => setSaveSuccess(false), 4000);
      }
    } catch (err) {
      console.error("Save error:", err);
    } finally {
      setSavingToken(false);
    }
  }

  async function handleSendTestLead() {
    setSimLoading(true);
    setSimResult(null);
    try {
      const res = await fetch("/api/webhooks/meta-ads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          test: true,
          name: simName,
          phone: simPhone,
          email: simEmail,
          state: simState,
          city: simCity,
          neetStatus: simNeet,
          preferredCountry: simCountry,
          campaign: simCampaign,
          adset: `${simState} State AdSet`,
        }),
      });
      const data = await res.json();
      setSimResult(data);
    } catch (err: any) {
      setSimResult({ error: err.message || "Failed to submit test lead" });
    } finally {
      setSimLoading(false);
    }
  }

  if (!isOpen) return null;

  const webhookUrl = `${origin || "https://your-crm-domain.com"}/api/webhooks/meta-ads`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-zinc-200/90 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m3 11 18-5v12L3 13v-2z" />
                <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
              </svg>
            </span>
            <div>
              <h2 className="text-base font-black text-zinc-900 tracking-tight flex items-center gap-2">
                Meta Lead Ads Integration
                <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-purple-200">
                  State-wise Campaign
                </span>
              </h2>
              <p className="text-xs text-zinc-500 font-medium">
                Real-time lead ingestion &amp; automatic Round-Robin distribution
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition cursor-pointer"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-zinc-200 bg-white px-5 gap-6">
          <button
            onClick={() => setActiveTab("setup")}
            className={`py-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === "setup"
                ? "border-purple-600 text-purple-700"
                : "border-transparent text-zinc-500 hover:text-zinc-800"
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
            </svg>
            Meta Webhook Setup
          </button>

          <button
            onClick={() => setActiveTab("distribution")}
            className={`py-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === "distribution"
                ? "border-purple-600 text-purple-700"
                : "border-transparent text-zinc-500 hover:text-zinc-800"
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            Round-Robin Routing
            <span className="bg-emerald-100 text-emerald-800 text-[10px] px-1.5 py-0.2 rounded-full font-bold ml-1">
              Active
            </span>
          </button>

          <button
            onClick={() => setActiveTab("simulator")}
            className={`py-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === "simulator"
                ? "border-purple-600 text-purple-700"
                : "border-transparent text-zinc-500 hover:text-zinc-800"
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            Live Simulator &amp; Test Lead
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {activeTab === "setup" && (
            <div className="space-y-5">
              {/* Webhook Credentials Box */}
              <div className="bg-purple-50/60 border border-purple-200/80 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-900 uppercase tracking-wider">
                    1. Meta Webhook URL (Callback URL)
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(webhookUrl);
                      setCopiedUrl(true);
                      setTimeout(() => setCopiedUrl(false), 2000);
                    }}
                    className="text-[11px] font-bold text-purple-700 bg-white border border-purple-200 px-2.5 py-1 rounded-lg hover:bg-purple-50 transition cursor-pointer flex items-center gap-1"
                  >
                    {copiedUrl ? "✓ Copied" : "Copy URL"}
                  </button>
                </div>
                <div className="p-2.5 bg-white rounded-lg border border-purple-100 font-mono text-xs text-zinc-800 break-all select-all">
                  {webhookUrl}
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs font-bold text-purple-900 uppercase tracking-wider">
                    2. Verify Token
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(verifyToken);
                      setCopiedToken(true);
                      setTimeout(() => setCopiedToken(false), 2000);
                    }}
                    className="text-[11px] font-bold text-purple-700 bg-white border border-purple-200 px-2.5 py-1 rounded-lg hover:bg-purple-50 transition cursor-pointer flex items-center gap-1"
                  >
                    {copiedToken ? "✓ Copied" : "Copy Token"}
                  </button>
                </div>
                <div className="p-2.5 bg-white rounded-lg border border-purple-100 font-mono text-xs text-zinc-800 font-bold select-all">
                  {verifyToken}
                </div>
              </div>

              {/* Page Access Token Configuration */}
              <div className="border border-zinc-200 rounded-xl p-4 bg-white space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                      3. Meta Page Access Token
                    </h3>
                    <p className="text-[11px] text-zinc-500">
                      Required by Meta Graph API to read lead information (student name, phone, state, NEET score, and custom form answers)
                    </p>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      hasPageAccessToken
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-amber-50 text-amber-700 border-amber-200"
                    }`}
                  >
                    {hasPageAccessToken ? "✓ Token Connected" : "Token Not Set"}
                  </span>
                </div>

                {hasPageAccessToken && (
                  <div className="flex items-center gap-2 text-xs text-zinc-600 bg-zinc-50 p-2.5 rounded-lg border border-zinc-200">
                    <span className="font-semibold">Active Token:</span>
                    <span className="font-mono text-zinc-800">{pageAccessTokenMasked}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-zinc-700">
                    {hasPageAccessToken ? "Update Page Access Token" : "Enter Meta Page Access Token"}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={pageAccessToken}
                      onChange={(e) => setPageAccessToken(e.target.value)}
                      placeholder="EAAP..."
                      className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-xs font-mono text-zinc-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                    />
                    <button
                      onClick={handleSaveToken}
                      disabled={savingToken || !pageAccessToken.trim()}
                      className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold text-xs px-4 py-2 rounded-lg transition cursor-pointer flex items-center gap-1.5"
                    >
                      {savingToken ? "Saving..." : "Save Token"}
                    </button>
                  </div>
                </div>

                {saveSuccess && (
                  <div className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 p-2 rounded-lg">
                    ✓ Page Access Token updated successfully!
                  </div>
                )}
              </div>

              {/* Instructions */}
              <div className="border border-zinc-200 rounded-xl p-4 bg-zinc-50 space-y-2.5 text-xs text-zinc-600">
                <h4 className="font-bold text-zinc-900">How to configure in Meta for Developers:</h4>
                <ol className="list-decimal list-inside space-y-1.5 leading-relaxed">
                  <li>Go to <strong>developers.facebook.com</strong> &gt; your App &gt; <strong>Webhooks</strong>.</li>
                  <li>Select <strong>Page</strong> from the dropdown, click <strong>Subscribe to this object</strong>.</li>
                  <li>Paste the <strong>Callback URL</strong> and <strong>Verify Token</strong> from above, then click <strong>Verify and save</strong>.</li>
                  <li>Under Page Subscription fields, subscribe to the <strong>leadgen</strong> event.</li>
                  <li>All leads from your active <strong>State-wise</strong> campaign will now sync into the CRM in real time!</li>
                </ol>
              </div>
            </div>
          )}

          {activeTab === "distribution" && (
            <div className="space-y-5">
              {/* Distribution Policy Highlight */}
              <div className="rounded-xl border border-purple-200 bg-purple-50/70 p-4 space-y-2">
                <div className="flex items-center gap-2 text-purple-900 font-bold text-sm">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  State-wise Campaign Lead Distribution Policy
                </div>
                <p className="text-xs text-purple-800 leading-relaxed font-medium">
                  Currently, we have <strong>{counselors.length} user/counselor</strong> registered in the CRM.
                  {counselors.length === 1 ? (
                    <>
                      {" "}As configured, <strong>{counselors[0]?.name}</strong> will receive <strong>100%</strong> of the incoming leads from the State-wise campaign.
                    </>
                  ) : (
                    <>
                      {" "}Leads are actively rotating across all active counselors via fair <strong>Round-Robin</strong>.
                    </>
                  )}
                </p>
                <div className="mt-2 text-[11px] text-purple-700 bg-white/80 p-2.5 rounded-lg border border-purple-100 flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-purple-600 shrink-0">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                  <span>
                    When you create new counselors under <strong>Admin &gt; Counselors / Agents</strong>, the system automatically detects them and distributes incoming leads 1-by-1 in round-robin rotation.
                  </span>
                </div>
              </div>

              {/* Counselors Table */}
              <div className="border border-zinc-200 rounded-xl overflow-hidden bg-white">
                <div className="bg-zinc-50 px-4 py-2.5 border-b border-zinc-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-800">
                    Registered CRM Counselors &amp; Users ({counselors.length})
                  </span>
                  <span className="text-[11px] text-zinc-500 font-medium">
                    {distributionMode}
                  </span>
                </div>

                <div className="divide-y divide-zinc-100">
                  {counselors.map((c) => (
                    <div key={c.id} className="p-3.5 flex items-center justify-between hover:bg-zinc-50/50 transition">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-purple-100 text-purple-700 font-bold text-xs flex items-center justify-center">
                          {c.name?.charAt(0) || "U"}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
                            {c.name}
                            {counselors.length === 1 && (
                              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.2 rounded-full">
                                Currently Assigned 100% Leads
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-zinc-400 font-mono">{c.email}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200">
                          {c.branchName}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            c.isLeadPaused
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-emerald-50 text-emerald-700 border-emerald-200"
                          }`}
                        >
                          {c.isLeadPaused ? "Paused" : "Active & Ready"}
                        </span>
                      </div>
                    </div>
                  ))}

                  {counselors.length === 0 && (
                    <div className="p-4 text-center text-xs text-zinc-400">
                      No counselors found. Leads will route to Administrator by default.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "simulator" && (
            <div className="space-y-4">
              <div className="bg-blue-50/60 border border-blue-200/80 rounded-xl p-3.5 text-xs text-blue-900 flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-600 shrink-0">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 16v-4" />
                  <path d="M12 8h.01" />
                </svg>
                <span>
                  Test how an incoming lead from the <strong>State-wise</strong> campaign gets captured and assigned to your counselor in real time.
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="font-bold text-zinc-700">Student Name</label>
                  <input
                    type="text"
                    value={simName}
                    onChange={(e) => setSimName(e.target.value)}
                    className="w-full mt-1 border border-zinc-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-zinc-700">Phone / WhatsApp</label>
                  <input
                    type="text"
                    value={simPhone}
                    onChange={(e) => setSimPhone(e.target.value)}
                    className="w-full mt-1 border border-zinc-300 rounded-lg p-2 text-xs font-mono focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-zinc-700">Email Address</label>
                  <input
                    type="email"
                    value={simEmail}
                    onChange={(e) => setSimEmail(e.target.value)}
                    className="w-full mt-1 border border-zinc-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-zinc-700">State (from Ad Campaign)</label>
                  <select
                    value={simState}
                    onChange={(e) => setSimState(e.target.value)}
                    className="w-full mt-1 border border-zinc-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  >
                    <option value="Rajasthan">Rajasthan</option>
                    <option value="Bihar">Bihar</option>
                    <option value="Uttar Pradesh">Uttar Pradesh</option>
                    <option value="Maharashtra">Maharashtra</option>
                    <option value="Delhi NCR">Delhi NCR</option>
                    <option value="West Bengal">West Bengal</option>
                    <option value="Madhya Pradesh">Madhya Pradesh</option>
                    <option value="Punjab">Punjab</option>
                    <option value="Gujarat">Gujarat</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-zinc-700">City</label>
                  <input
                    type="text"
                    value={simCity}
                    onChange={(e) => setSimCity(e.target.value)}
                    className="w-full mt-1 border border-zinc-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-zinc-700">NEET Status</label>
                  <input
                    type="text"
                    value={simNeet}
                    onChange={(e) => setSimNeet(e.target.value)}
                    className="w-full mt-1 border border-zinc-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-zinc-700">Preferred Country</label>
                  <select
                    value={simCountry}
                    onChange={(e) => setSimCountry(e.target.value)}
                    className="w-full mt-1 border border-zinc-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  >
                    <option value="Russia">Russia</option>
                    <option value="Uzbekistan">Uzbekistan</option>
                    <option value="Kazakhstan">Kazakhstan</option>
                    <option value="Kyrgyzstan">Kyrgyzstan</option>
                    <option value="Georgia">Georgia</option>
                    <option value="China">China</option>
                    <option value="Nepal">Nepal</option>
                    <option value="Others">Others</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-zinc-700">Campaign Name</label>
                  <input
                    type="text"
                    value={simCampaign}
                    onChange={(e) => setSimCampaign(e.target.value)}
                    className="w-full mt-1 border border-zinc-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleSendTestLead}
                  disabled={simLoading || !simName || !simPhone}
                  className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold text-xs py-2.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-2 shadow-xs"
                >
                  {simLoading ? (
                    "Submitting Test Lead..."
                  ) : (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polygon points="5 3 19 12 5 21 5 3" />
                      </svg>
                      Simulate Incoming State-wise Lead &amp; Test Round-Robin
                    </>
                  )}
                </button>
              </div>

              {simResult && (
                <div
                  className={`p-3.5 rounded-xl border text-xs ${
                    simResult.success || simResult.status === "created"
                      ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                      : "bg-amber-50 border-amber-200 text-amber-900"
                  }`}
                >
                  <div className="font-bold flex items-center gap-1.5">
                    {simResult.success || simResult.status === "created" ? "✓ Lead Captured Successfully!" : "Status:"}
                  </div>
                  <div className="mt-1 font-medium">
                    {simResult.message || JSON.stringify(simResult)}
                  </div>
                  {simResult.assignedTo && (
                    <div className="mt-2 text-[11px] bg-white/80 p-2 rounded border border-emerald-200 font-mono text-emerald-800">
                      Assigned Counselor: <strong>{simResult.assignedTo.name}</strong> ({simResult.assignedTo.id})
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-100 bg-zinc-50 flex items-center justify-between">
          <div className="text-[11px] text-zinc-500">
            Campaign: <strong>State-wise</strong> &bull; Channel: <strong>Meta Ads</strong>
          </div>
          <button
            onClick={onClose}
            className="text-xs font-bold text-zinc-700 bg-white border border-zinc-200 hover:bg-zinc-100 px-4 py-2 rounded-lg transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
