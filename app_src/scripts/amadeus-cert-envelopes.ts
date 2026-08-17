/**
 * Amadeus certification — SOAP envelope bundle generator (offline).
 *
 *   npx tsx scripts/amadeus-cert-envelopes.ts [--out <dir>] [--case TC1] [--date <yyyy-mm-dd>]
 *
 * Writes one XML file per SOAP message, per certification test case:
 *
 *   amadeus-cert-output/TC1/1.Air_SellFromRecommendation.RQ.xml … 10.Security_SignOut.RQ.xml
 *
 * Every envelope comes from `planBookingMessages()` in src/lib/amadeus-booking.ts —
 * the same builders `runBookingFlow()` sends on the wire — so the XML here is
 * exactly what the integration transmits. No network I/O.
 *
 * Response (.RS.xml) logs are NOT produced here: nodeD2 only answers a whitelisted
 * IP and WSAP 1ASIWTOUMY2 is not yet entitled for Prime booking, so nothing can be
 * captured live yet. Once Amadeus enables it, the same files regenerate WITH
 * responses via  POST /api/amadeus/cert-run { caseId, write: true }.
 */
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/* ---- args ---- */

const argv = process.argv.slice(2);
const arg = (flag: string) => {
  const i = argv.indexOf(flag);
  return i >= 0 ? argv[i + 1] : undefined;
};
const outDir = resolve(ROOT, arg("--out") || "amadeus-cert-output");
const onlyCase = arg("--case");
const baseDate = arg("--date") || new Date().toISOString().slice(0, 10);

/* ---- env (cfg in amadeus-booking is read at import time, so load .env first) ---- */

async function loadEnv() {
  let raw = "";
  try {
    raw = await readFile(join(ROOT, ".env"), "utf8");
  } catch {
    console.warn("[cert] no .env found — envelopes will use the built-in defaults");
    return;
  }
  for (const line of raw.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
}

/**
 * What Amadeus returns for each message — the "EXPECTED RESPONSE" the analyst
 * reads next to the payload (documentation text, taken from the WBS guide).
 */
const EXPECTED: Record<string, string> = {
  Air_SellFromRecommendation:
    "itineraryDetails with the sold segments at statusCode HK. No availability → errorCode 288 / statusCode UNS, which drives the IBP branch. The reply header carries the awsse:Session (SessionId, SequenceNumber, SecurityToken) every later message chains on.",
  Fare_InformativeBestPricingWithoutPNR:
    "fareList / recommendation with the available booking class per segment and the total amount.",
  PNR_AddMultiElements: "pnrHeader plus the echoed traveller / element data (no record locator yet — assigned at commit).",
  "PNR_AddMultiElements(SSR)": "dataElementsMaster echoing the added SSRs with their status.",
  "PNR_AddMultiElements(commit)": "reservation/controlNumber = the 6-character PNR record locator; securityInformation.",
  Air_RetrieveSeatMap: "seatMapInformation: cabin layout with free / occupied seats and, where chargeable, their price.",
  FOP_CreateFormOfPayment: "fopDescription confirming the form of payment is attached.",
  Fare_PricePNRWithBookingClass:
    "fareList with monetaryDetails (base fare, taxes, total) per passenger type; the TST content to be created.",
  Ticket_CreateTSTFromPricing: "tstReference(s) for the created TST(s).",
  PNR_Retrieve: "The full committed PNR: travellers, itinerary, TSTs and all elements.",
  DocIssuance_IssueTicket: "documentDetails with the 13-digit e-ticket number(s), status issued.",
  Ticket_CreateTSMFareElement: "tsmReference for the created TSM.",
  DocIssuance_IssueMiscellaneousDocuments: "documentDetails with the EMD number, status issued.",
  Ticket_CancelDocument: "Void confirmation (statusCode) for the e-ticket(s).",
  PNR_Cancel: "Cancellation confirmed; itinerary elements removed; record locator retained with cancelled status.",
  Security_SignOut: "processStatus confirming the session is released.",
};

const SECURITY_NOTE =
  "First message of the session: SOAP header carries the WS-Security UsernameToken digest = Base64(SHA1(nonce + created + SHA1(password))) plus AMA_SecurityHostedUser.";
const CHAIN_NOTE = "Chains on the SessionId / SequenceNumber / SecurityToken returned by the previous reply.";

const xmlText = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

async function main() {
  await loadEnv();
  const endpoint = process.env.AMADEUS_ENDPOINT || "https://nodeD2.test.webservices.amadeus.com/1ASIWTOUMY2";

  const { buildCertCases, planCase } = await import("../src/lib/amadeus-cert-cases.ts");
  const { renderEnvelopeFile, opLabel } = await import("../src/lib/amadeus-cert-export.ts");

  const all = buildCertCases(baseDate);
  const cases = onlyCase ? all.filter((c) => c.id === onlyCase) : all;
  if (!cases.length) throw new Error(`Unknown case ${onlyCase}. Valid: ${all.map((c) => c.id).join(", ")}`);

  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });

  const manifestCases: string[] = [];
  let total = 0;

  for (const c of cases) {
    const messages = planCase(c);
    const dir = join(outDir, c.id);
    await mkdir(dir, { recursive: true });

    for (const m of messages) {
      const notes: Record<string, string> = {};
      if (m.conditional) notes.Conditional = m.conditional;
      notes.Security = m.sessionStatus === "Start" ? SECURITY_NOTE : CHAIN_NOTE;
      if (EXPECTED[m.name]) notes["Expected response"] = EXPECTED[m.name];
      notes.Status = "REQUEST log — generated by the TouristLeader integration. The matching .RS.xml is captured once WSAP 1ASIWTOUMY2 is booking-enabled on a whitelisted IP.";

      const content = renderEnvelopeFile(m.envelope, {
        case: `${c.id} · ${c.title}`,
        step: m.step,
        stepCount: messages.length,
        operation: m.name,
        action: m.action,
        endpoint,
        direction: "request",
        sessionStatus: m.sessionStatus,
        notes,
      });
      await writeFile(join(dir, `${m.step}.${opLabel(m.name)}.RQ.xml`), content, "utf8");
      total++;
    }

    const pax = c.input.passengers.reduce<Record<string, number>>((a, p) => ({ ...a, [p.type]: (a[p.type] || 0) + 1 }), {});
    const paxLabel = ["ADT", "CHD", "INF"].filter((t) => pax[t]).map((t) => `${pax[t]} ${t}`).join(" + ");
    const journey = c.input.segments.map((s) => `${s.from}→${s.to} ${s.carrier}${s.flightNumber} ${s.departDate} (${s.bookingClass})`);

    manifestCases.push(
      [
        `  <case id="${c.id}">`,
        `    <title>${xmlText(c.title)}</title>`,
        `    <passengers>${xmlText(paxLabel)}</passengers>`,
        `    <formOfPayment>${c.input.fop.type === "CARD" ? "Credit card" : "Cash"}</formOfPayment>`,
        `    <journey>`,
        ...journey.map((j) => `      <segment>${xmlText(j)}</segment>`),
        `    </journey>`,
        `    <flow messages="${messages.length}">`,
        ...messages.map(
          (m) =>
            `      <message step="${m.step}" session="${m.sessionStatus}"${m.conditional ? ' conditional="288/UNS"' : ""} file="${m.step}.${opLabel(m.name)}.RQ.xml">${xmlText(m.name)}</message>`,
        ),
        `    </flow>`,
        `  </case>`,
      ].join("\n"),
    );

    console.log(`${c.id}: ${messages.length} envelopes → ${dir.replace(`${ROOT}/`, "")}`);
  }

  const manifest = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    "<amadeusCertification>",
    "  <agency>MYTL Adventures Private Limited T/A Tourist Leader</agency>",
    "  <officeId>BLRVS32YA</officeId>",
    "  <wsap>1ASIWTOUMY2</wsap>",
    "  <userId>WSMY2TOU</userId>",
    "  <environment>Test — nodeD2.test.webservices.amadeus.com</environment>",
    `  <endpoint>${xmlText(endpoint)}</endpoint>`,
    `  <generated>${new Date().toISOString()}</generated>`,
    `  <baseDate>${baseDate}</baseDate>`,
    "  <content>One XML file per SOAP message. .RQ.xml = request envelope (live-code generated). .RS.xml = response envelope, captured once the WSAP is booking-enabled on a whitelisted IP.</content>",
    ...manifestCases,
    "</amadeusCertification>",
    "",
  ].join("\n");

  await writeFile(join(outDir, "manifest.xml"), manifest, "utf8");
  await writeFile(join(outDir, "README.txt"), readme(cases.length, total), "utf8");
  console.log(`\n${total} envelopes + manifest.xml + README.txt → ${outDir.replace(`${ROOT}/`, "")}`);
}

function readme(caseCount: number, total: number): string {
  return [
    "TouristLeader × Amadeus — IBE Prime booking & cancellation certification",
    "=======================================================================",
    "",
    `${caseCount} test case folder(s), ${total} SOAP messages in total. One XML file per message,`,
    "numbered in send order:",
    "",
    "  <step>.<Operation>.RQ.xml    request envelope",
    "  <step>.<Operation>.RS.xml    response envelope (added on the live certification run)",
    "",
    "Each file is a standalone XML document: the SOAP envelope exactly as transmitted,",
    "preceded by an XML comment giving the case, step, operation, SOAPAction, endpoint,",
    "session status and the expected response.",
    "",
    "manifest.xml lists every case with its passengers, journey and the full message flow",
    "(the flow chart, in machine-readable form).",
    "",
    "Session model",
    "-------------",
    "Booking is stateful. The FIRST message opens the session",
    '(awsse:Session TransactionStatusCode="Start") and carries the WS-Security',
    "<UsernameToken> password digest = Base64(SHA1(nonce + created + SHA1(password))).",
    "The reply returns SessionId / SequenceNumber / SecurityToken; every following",
    'message chains as "InSeries" with the sequence incremented, and the last message',
    'is flagged "End".',
    "",
    "Test cases",
    "----------",
    "  TC1  One Way              1 ADT + 1 CHD + 1 INF   booking + ticket issuance",
    "  TC2  Round Trip (conn.)   2 ADT + 1 CHD + 1 INF   booking + ticketing → cancellation",
    "  TC3  Round Trip (conn.)   1 ADT + 1 CHD + 1 INF   ancillaries (seat/bag/meal) + EMD",
    "  TC4  Round Trip           1 ADT + 1 CHD           Fare Family / Upsell fares",
    "",
    "Status",
    "------",
    "Request envelopes are produced by the production integration code, so they are",
    "exactly what we transmit. Response logs are not included yet — three things are",
    "needed on the Amadeus side first:",
    "",
    "  1. whitelist the server's static IP on nodeD2;",
    "  2. enable the Prime booking + ticketing web services on WSAP 1ASIWTOUMY2",
    "     (currently provisioned for Fare_MasterPricerTravelBoardSearch only);",
    "  3. provide bookable test inventory (Air_Sell currently returns 288/UNS —",
    "     the integration already implements the documented IBP fallback for that).",
    "",
    "Once those are in place the same bundle regenerates with both RQ and RS logs via",
    "POST /api/amadeus/cert-run { caseId, write: true }.",
    "",
  ].join("\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
