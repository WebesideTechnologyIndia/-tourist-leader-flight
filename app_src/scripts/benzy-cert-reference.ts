/**
 * Benzy certification — reference response transport (offline).
 *
 * Benzy's staging hosts only answer whitelisted IPs, so the certification bundle
 * can't be captured live yet. This module stands in for the network: it answers
 * every Benzy endpoint with a response built to the SAME shape as Benzy's own
 * certification reference bundle (the shapes documented in benzy-booking.ts and
 * shown in the technical-test document), derived from the request our client
 * actually sends.
 *
 * That means the REQUEST side of every generated file is produced by the real
 * production code path in benzy-booking.ts — nothing is re-implemented here — and
 * only the response side is reference data. Every value is internally consistent
 * within a case (TUI chaining, fares, PNR, transaction id).
 *
 * Once the IP is whitelisted, run the live route instead:
 *   POST /api/benzy/cert-run { caseId, write: true }
 *
 * Fares mirror the reference bundle exactly for the direct/one-way case:
 *   gross/pax  ADT 4049 · CHD 4049 · INF 1838   → leg gross 19872
 *   net = gross − agent markup (135/135/88) − commission share (41/pax)
 *                                              → leg net   18910
 */

type Json = Record<string, unknown>;

/* ------------------------------------------------------------------ *
 * Fare model
 * ------------------------------------------------------------------ */

type PTC = "ADT" | "CHD" | "INF";

interface PaxFare {
  base: number;
  tax: number;
  gross: number;
  markup: number;
}

const COMMISSION_PER_PAX = 41;

const FARES: Record<"direct" | "connection", Record<PTC, PaxFare>> = {
  direct: {
    ADT: { base: 2700, tax: 1214, gross: 4049, markup: 135 },
    CHD: { base: 2700, tax: 1214, gross: 4049, markup: 135 },
    INF: { base: 1750, tax: 0, gross: 1838, markup: 88 },
  },
  connection: {
    ADT: { base: 3450, tax: 1304, gross: 4754, markup: 135 },
    CHD: { base: 3450, tax: 1304, gross: 4754, markup: 135 },
    INF: { base: 1750, tax: 0, gross: 1750, markup: 88 },
  },
};

const netOf = (f: PaxFare) => f.gross - f.markup - COMMISSION_PER_PAX;

/** Totals for one leg carrying 2 ADT + 2 CHD + 2 INF. */
function legTotals(routing: "direct" | "connection") {
  const f = FARES[routing];
  const counts: Record<PTC, number> = { ADT: 2, CHD: 2, INF: 2 };
  let gross = 0,
    net = 0,
    base = 0,
    tax = 0,
    markup = 0;
  (Object.keys(counts) as PTC[]).forEach((ptc) => {
    const n = counts[ptc];
    gross += f[ptc].gross * n;
    net += netOf(f[ptc]) * n;
    base += f[ptc].base * n;
    tax += f[ptc].tax * n;
    markup += f[ptc].markup * n;
  });
  return { gross, net, base, tax, markup, commission: COMMISSION_PER_PAX * 6 };
}

function ptcFares(routing: "direct" | "connection", withTaxSplit: boolean): Json[] {
  const f = FARES[routing];
  return (["ADT", "CHD", "INF"] as PTC[]).map((ptc) => ({
    PTC: ptc,
    Fare: f[ptc].base,
    YQ: 0,
    PSF: 0,
    YR: 0,
    UD: ptc === "INF" ? 0 : 649,
    K3: 0,
    K7: 0,
    API: 0,
    ...(withTaxSplit ? { RCF: ptc === "INF" ? 0 : 50, RCS: 0, PHF: ptc === "INF" ? 0 : 50, CUTE: 0 } : {}),
    OTT: ptc === "INF" ? "" : "PHF,RCF,ASF,UDFA,29GST",
    OT: ptc === "INF" ? "" : "50,50,236,89,140",
    Tax: f[ptc].tax,
    GrossFare: f[ptc].gross,
    NetFare: netOf(f[ptc]),
    ST: 0,
    TransactionFee: 0,
    VATonServiceCharge: 0,
    VATonTransactionFee: 0,
    AgentMarkUp: f[ptc].markup,
    AddonMarkup: 0,
    AddonSTFAmount: 0,
    OfflineSeviceCharge: 0,
    ATOAddonMarkup: 0,
    AddonDiscount: 0,
    Ammendment: 0,
    AtoCharge: 0,
    ReissueCharge: 0,
    OldSSRAmount: 0,
    CGST: 0,
    SGST: 0,
    IGST: 0,
  }));
}

function fareBlock(routing: "direct" | "connection"): Json {
  const t = legTotals(routing);
  return {
    PTCFare: ptcFares(routing, true),
    GrossFare: t.gross,
    NetFare: t.net,
    TotalServiceTax: 0,
    TotalTransactionFee: 0,
    TotalBaseFare: t.base,
    TotalTax: t.tax,
    TotalCommission: t.commission,
    TotalVATonServiceCharge: 0,
    TotalVATonTransactionFee: 0,
    TotalAgentMarkUp: t.markup,
    TotalAddonMarkup: 0,
    TotalAddonDiscount: 0,
    TotalAtoCharge: 0,
    TotalReissueCharge: 0,
    OldSSRAmount: 0,
  };
}

/* ------------------------------------------------------------------ *
 * Flight inventory (BLR–BOM, IndiGo — same market as the reference)
 * ------------------------------------------------------------------ */

const AIRPORTS: Record<string, string> = {
  BLR: "Bengaluru International Airport |Bangalore",
  BOM: "Chhatrapati Shivaji |Mumbai",
  HYD: "Rajiv Gandhi International Airport |Hyderabad",
};

const airportName = (code: string) => AIRPORTS[code] || code;

interface LegSpec {
  index: string;
  flightNo: string;
  stops: number;
  depTime: string; // HH:mm on the travel date
  arrTime: string;
  arrivesNextDay: boolean;
  duration: string;
  routing: "direct" | "connection";
  fareClass: string;
  fbc: string;
  fcType: string;
}

/** Two direct options + one connecting option, per trip direction. */
function inventory(direction: "onward" | "return"): LegSpec[] {
  const base = direction === "onward" ? 74 : 140;
  return [
    { index: `6E|${base}`, flightNo: "5295", stops: 0, depTime: "22:15", arrTime: "00:05", arrivesNextDay: true, duration: "01h 50m ", routing: "direct", fareClass: "A", fbc: "RFIP", fcType: "FAMILY" },
    { index: `6E|${base + 16}`, flightNo: "6423", stops: 0, depTime: "07:40", arrTime: "09:25", arrivesNextDay: false, duration: "01h 45m ", routing: "direct", fareClass: "J", fbc: "RUIP", fcType: "FLEXI PLUS FARE" },
    { index: `6E|${base + 15}`, flightNo: "6923", stops: 1, depTime: "04:55", arrTime: "09:50", arrivesNextDay: false, duration: "04h 55m ", routing: "connection", fareClass: "R", fbc: "AA07", fcType: "SAVER" },
  ];
}

const stamp = (date: string, time: string, nextDay: boolean) => {
  const d = new Date(`${date}T00:00:00Z`);
  if (nextDay) d.setUTCDate(d.getUTCDate() + 1);
  return `${d.toISOString().slice(0, 10)}T${time}:00`;
};

function journey(spec: LegSpec, from: string, to: string, date: string, returnIdentifier: number): Json {
  const t = legTotals(spec.routing);
  return {
    Stops: spec.stops,
    Seats: 79,
    ReturnIdentifier: returnIdentifier,
    Index: spec.index,
    Provider: "6E",
    FlightNo: spec.flightNo,
    VAC: "6E",
    MAC: "6E",
    OAC: "6E",
    IsSeniorCitizen: false,
    ArrivalTime: stamp(date, spec.arrTime, spec.arrivesNextDay),
    DepartureTime: stamp(date, spec.depTime, false),
    ArrivalTerminal: "1",
    DepartureTerminal: "1",
    FareClass: spec.fareClass,
    Duration: spec.duration,
    GroupCount: 0,
    TotalFare: null,
    GrossFare: t.gross,
    TotalCommission: t.commission,
    TotalTransactionFee: 0,
    TotalVatOnTFee: 0,
    NetFare: t.net,
    ActualFare: 0,
    WPNetFare: 0,
    Hops: 0,
    Notice: "",
    NoticeLink: "",
    NoticeType: null,
    Refundable: "Y",
    Alliances: "",
    Amenities: "",
    Inclusions: { Baggage: null, Meals: null, PieceDescription: null },
    Hold: true,
    HoldInfo: "E|10:01|10.00|SE|EE",
    Connections:
      spec.routing === "connection"
        ? [{ Airport: "HYD", ArrAirportName: airportName("HYD"), Duration: "02h 00m ", Type: "C", MAC: "6E|IndiGo", VAC: "6E", OAC: "6E", FlightNo: "5213", From: null, To: null }]
        : [],
    From: from,
    To: to,
    FromName: airportName(from),
    ToName: airportName(to),
    AirlineName: "IndiGo|IndiGo|IndiGo",
    GDSPriority: 0,
    AirCraft: "320",
    RBD: "R",
    Cabin: "E",
    FBC: spec.fbc,
    FCBegin: "",
    FCEnd: "",
    FCType: spec.fcType,
    FCGroup: "Published",
    GFL: false,
    Promo: "ATFLY",
    Recommended: false,
    FareType: "PB-",
    TrendFare: t.gross,
    IsBusStation: false,
    ChannelCode: null,
    WpIndex: null,
    JourneyKey: `6E,${spec.flightNo},${from},${to},${stamp(date, spec.depTime, false)},${stamp(date, spec.arrTime, spec.arrivesNextDay)},1,,${spec.duration}`,
    Farelink: null,
    MisEShare: "",
    MoreFltKey: "",
    WPRegionCode: "",
    Remarks: "",
  };
}

/* ------------------------------------------------------------------ *
 * Per-run state
 * ------------------------------------------------------------------ */

export interface RefCase {
  id: number;
  name: string;
  tripType: "ON" | "RT";
  routing: "direct" | "connection";
  baggage: boolean;
}

interface SelectedLeg {
  index: string;
  amount: number;
  fuid: number;
  spec: LegSpec;
  from: string;
  to: string;
  date: string;
}

interface RunState {
  c: RefCase;
  runStamp: string;
  masterTui: string;
  repricedTui: string;
  itinTui: string;
  transactionId: number;
  pnr: string;
  from: string;
  to: string;
  onwardDate: string;
  returnDate: string;
  legs: SelectedLeg[];
  travellers: Json[];
  contact: Json;
  ssrRequested: number;
  startPayCalls: number;
}

/** Deterministic pseudo-GUID so re-running the generator is stable. */
function guid(seed: string): string {
  let h = 0x811c9dc5;
  const hex: string[] = [];
  for (let i = 0; i < 32; i++) {
    for (let j = 0; j < seed.length; j++) {
      h ^= seed.charCodeAt(j) + i * 31;
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    hex.push(((h >>> (i % 24)) & 0xf).toString(16));
  }
  const s = hex.join("");
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-4${s.slice(13, 16)}-a${s.slice(17, 20)}-${s.slice(20, 32)}`;
}

function tuiStamp(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

/* ------------------------------------------------------------------ *
 * Endpoint responders
 * ------------------------------------------------------------------ */

const ok = (extra: Json = {}): Json => ({ Code: "200", Msg: ["Success"], ...extra });

function signatureResponse(s: RunState): Json {
  return {
    TUI: `${guid(`sig-a-${s.c.id}`)}|${guid(`sig-b-${s.c.id}`)}|${s.runStamp}`,
    Token: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${guid(`tok-${s.c.id}`).replace(/-/g, "")}.${guid(`sig-${s.c.id}`).replace(/-/g, "").slice(0, 43)}`,
    ClientID: "FVI6V120g22Ei5ztGK0FIQ==",
    LastLoginDate: new Date().toLocaleString("en-US"),
    Password: "L2Et4G/Xq4lLXAGxCs6DHw==",
    loginAttempts: 0,
    UserType: "",
    Code: "200",
    Msg: ["Success"],
  };
}

function expressSearchResponse(s: RunState, body: Json): Json {
  const trip = (body.Trips as Json[])[0];
  s.from = String(trip.From);
  s.to = String(trip.To);
  s.onwardDate = String(trip.OnwardDate);
  s.returnDate = String(trip.ReturnDate || "");
  return {
    TUI: s.masterTui,
    Completed: null,
    CeilingInfo: null,
    CurrencyCode: null,
    Notices: null,
    Trips: null,
    Code: "200",
    Msg: ["Success"],
    success: true,
  };
}

const WEB_SETTINGS: Json[] = [
  { Key: "DomLCCchannelcode", Value: "6E,G8,G9,SG,IX,AK,FZ,LB,OP,2T,FG8,KG8,2S,PSG,C6E,ESG,E6E,EG8,CG8,CSG,C6E,EAK,PG8,I5,CI5,SI5,EI5" },
  { Key: "IntLCCchannelcode", Value: "6E,G8,G9,SG,IX,AK,FZ,TR,OP,2T,FG8,KG8,W5,TZ,LV,C6E,ESG,E6E,EG8,CG8,CSG,C6E,EAK" },
  { Key: "GSTEnabledAirlines", Value: "SG,6E,G8,CG8,AK,I5,IX,SB,AM,1G,G9,TZ,PSG,C6E,2T,ESG,E6E,EG8,CG8,CSG,C6E,EAK" },
  { Key: "ShowSeatLayoutDom", Value: "6E,SG,G8,I5,IX,AK,FZ" },
  { Key: "BaggageEnabledAirlines", Value: "6E,SG,G8,I5,IX,AK,FZ,G9,TZ" },
  { Key: "MealEnabledAirlines", Value: "6E,SG,G8,I5,IX,AK,FZ" },
];

function webSettingsResponse(s: RunState): Json {
  return ok({
    TUI: `${s.masterTui.split("|")[0]}|${guid(`ws-${s.c.id}`)}|${s.runStamp}`,
    Settings: WEB_SETTINGS,
    success: true,
  });
}

function getExpSearchResponse(s: RunState): Json {
  const trips: Json[] = [{ Journey: inventory("onward").map((spec) => journey(spec, s.from, s.to, s.onwardDate, 0)) }];
  if (s.c.tripType === "RT") {
    trips.push({ Journey: inventory("return").map((spec) => journey(spec, s.to, s.from, s.returnDate || s.onwardDate, 1)) });
  }
  return {
    TUI: s.masterTui,
    Completed: "True",
    CeilingInfo: null,
    CurrencyCode: "INR",
    Notices: null,
    Trips: trips,
    Code: "200",
    Msg: ["Success"],
    success: true,
  };
}

/** Resolve the legs the client selected (SSR/SmartPricer both post the same Trips). */
function rememberLegs(s: RunState, body: Json) {
  const trips = (body.Trips as Json[]) || [];
  s.legs = trips.map((t, i) => {
    const index = String(t.Index);
    const direction = i === 0 ? "onward" : "return";
    const spec = inventory(direction).find((sp) => sp.index === index) || inventory(direction)[0];
    return {
      index,
      amount: Number(t.Amount),
      fuid: i + 1,
      spec,
      from: i === 0 ? s.from : s.to,
      to: i === 0 ? s.to : s.from,
      date: i === 0 ? s.onwardDate : s.returnDate || s.onwardDate,
    };
  });
}

const MEALS: Json[] = [
  { Code: "CNWT", Description: "CASHEW (SALTED) 50 GMS", Charge: 300, ID: 15 },
  { Code: "VCSW", Description: "6E Eats choice of the day (veg) + beverage", Charge: 400, ID: 7 },
  { Code: "TCSW", Description: "Tomato Cucumber Cheese Lettuce Sandwich Combo", Charge: 400, ID: 8 },
];

const BAGS: Json[] = [
  { Code: "XBPA", Description: "Excess Baggage 3 Kgs", Charge: 1500, ID: 31 },
  { Code: "XBPB", Description: "Excess Baggage 5 Kgs", Charge: 2500, ID: 32 },
  { Code: "XBPC", Description: "Excess Baggage 10 Kgs", Charge: 4500, ID: 33 },
];

function ssrOption(o: Json, type: "1" | "2"): Json {
  return {
    Code: o.Code,
    Description: o.Description,
    PieceDescription: "",
    Charge: o.Charge,
    VAT: 0,
    Type: type,
    Category: "",
    PTC: "",
    ID: o.ID,
    IsFreeMeal: false,
    MealImage: "",
    SSRUrl: null,
    OriginalCurrencyCharge: 0,
    SSRSubCode: "",
    SSRTaxcharge: 0,
    SSRNetAmount: o.Charge,
    Discount: 0,
    AdditionalFields: null,
  };
}

function ssrResponse(s: RunState, body: Json): Json {
  rememberLegs(s, body);
  return {
    TUI: s.masterTui,
    CurrencyCode: "INR",
    PaidSSR: true,
    Trips: s.legs.map((leg) => ({
      From: leg.from,
      To: leg.to,
      Journey: [
        {
          Provider: "6E",
          MultiSSR: "",
          ConversationID: "",
          IsWebCheckInAvailable: false,
          WebCheckInMessage: null,
          Segments: [
            {
              FUID: String(leg.fuid),
              VAC: "6E",
              Index: null,
              SSR: [...MEALS.map((m) => ssrOption(m, "1")), ...BAGS.map((b) => ssrOption(b, "2"))],
            },
          ],
        },
      ],
    })),
    Code: "200",
    Msg: ["Success"],
    success: true,
  };
}

function smartPricerResponse(s: RunState, body: Json): Json {
  rememberLegs(s, body);
  return {
    TUI: s.repricedTui,
    Code: "200",
    Msg: ["Success"],
    CurrencyCode: null,
    From: null,
    To: null,
    FromName: null,
    ToName: null,
    OnwardDate: null,
    ReturnDate: null,
    ADT: 0,
    CHD: 0,
    INF: 0,
    YTH: 0,
    NetAmount: 0,
    GrossAmount: 0,
    InsPremium: 0,
    FareType: null,
    Source: null,
    HoldInfo: null,
    AlternateTrips: null,
    Trips: null,
    Rules: null,
    SSR: null,
    SSRChange: null,
    IsPrivateFare: false,
    CeilingInfo: "",
    success: true,
  };
}

function pricedSegment(leg: SelectedLeg): Json {
  return {
    Flight: {
      FUID: leg.fuid,
      VAC: "6E",
      MAC: "6E",
      OAC: "6E",
      FBC: leg.spec.fbc,
      Airline: "IndiGo|IndiGo|IndiGo",
      FlightNo: leg.spec.flightNo,
      ArrivalTime: stamp(leg.date, leg.spec.arrTime, leg.spec.arrivesNextDay),
      DepartureTime: stamp(leg.date, leg.spec.depTime, false),
      FareClass: leg.spec.fareClass,
      ArrivalCode: leg.to,
      DepartureCode: leg.from,
      ArrivalTerminal: "1",
      DepartureTerminal: "1",
      ArrAirportName: airportName(leg.to),
      DepAirportName: airportName(leg.from),
      EquipmentType: "321",
      RBD: "R",
      Cabin: "E",
      Refundable: "Y",
      Amenities: "",
      Seats: 0,
      Hops: [],
      Duration: leg.spec.duration,
      AirCraft: "AIRBUS JET",
      Farelink: null,
      FCBegin: "",
      FCEnd: "",
      CarbonEmissions: 0,
      BrandID: null,
    },
    Fares: fareBlock(leg.spec.routing),
  };
}

function cancellationRule(leg: SelectedLeg): Json {
  return {
    OrginDestination: `${leg.from}-${leg.to}`,
    FUID: String(leg.fuid),
    Provider: "6E",
    FareRuleText: null,
    Rule: [
      {
        Info: [
          { AdultAmount: "3999", ChildAmount: "3999", InfantAmount: "", Description: "0 Days - 3 Days To Departure", CurrencyCode: "INR", YouthAmount: "" },
          { AdultAmount: "2999", ChildAmount: "2999", InfantAmount: "", Description: "4 Days - 364 Days To Departure", CurrencyCode: "INR", YouthAmount: "" },
        ],
        Head: "Cancellation Fee",
      },
    ],
    FareRuleRemark: null,
  };
}

/** Free (included) baggage allowance, as GetSPricer reports it. */
function freeBaggage(legs: SelectedLeg[]): Json[] {
  const out: Json[] = [];
  legs.forEach((leg) =>
    (["ADT", "CHD", "INF"] as PTC[]).forEach((ptc) =>
      out.push({
        PTC: ptc,
        FUID: String(leg.fuid),
        Code: "BAG",
        Description: ptc === "INF" ? "0 Kg, 7 Kg" : "15 Kg, 7 Kg",
        PieceDescription: "",
        Charge: 0,
        Type: "2",
        VAT: 0,
        SSRCategory: null,
        MealImage: null,
        AdditionalFields: null,
      }),
    ),
  );
  return out;
}

function getSPricerResponse(s: RunState): Json {
  const gross = s.legs.reduce((a, l) => a + legTotals(l.spec.routing).gross, 0);
  const net = s.legs.reduce((a, l) => a + legTotals(l.spec.routing).net, 0);
  return {
    TUI: s.repricedTui,
    Code: "200",
    Msg: ["Success"],
    CurrencyCode: "INR",
    From: s.from,
    To: s.to,
    FromName: airportName(s.from),
    ToName: airportName(s.to),
    OnwardDate: s.onwardDate,
    ReturnDate: s.returnDate,
    ADT: 2,
    CHD: 2,
    INF: 2,
    YTH: 0,
    NetAmount: net,
    GrossAmount: gross,
    InsPremium: 0,
    FareType: s.c.tripType,
    Source: "LV",
    HoldInfo: "E|10:01|10.00|SE|EE",
    AlternateTrips: null,
    Trips: s.legs.map((leg) => ({
      Journey: [
        {
          Provider: "6E",
          ChannelCode: "",
          Stops: String(leg.spec.stops),
          OrderID: leg.fuid - 1,
          GrossFare: legTotals(leg.spec.routing).gross,
          NetFare: legTotals(leg.spec.routing).net,
          Duration: leg.spec.duration,
          Promo: "ATFLY",
          FCType: leg.spec.fcType,
          Segments: [pricedSegment(leg)],
          Notices: [],
          SeatHold: false,
          WPRegionCode: "",
        },
      ],
    })),
    Rules: s.legs.map(cancellationRule),
    SSR: freeBaggage(s.legs),
    SSRChange: null,
    IsPrivateFare: false,
    CeilingInfo: "",
    success: true,
  };
}

function travelCheckListResponse(s: RunState): Json {
  return {
    TUI: `${s.repricedTui.split("|")[0]}|${guid(`tcl-${s.c.id}`)}|${s.runStamp}`,
    Code: "200",
    Msg: ["Success"],
    TravellerCheckList: [{ Nationality: true, VisaType: true, PDOE: true, PLI: true, PassportNo: true, DOB: true, PDOI: true, Pancard: false }],
    SSRCheckList: { Trips: [null] },
    FnuLnuSettings: [
      {
        AirlineCode: "6E",
        TitleMandatory: true,
        Fnumessage: "Please enter your First Name. If First Name is not available then please enter your last name twice both in last name and first name column",
        Lnumessage: "Please enter your Last Name. If the last name is not available, enter the first name again in the last name field, to proceed further with the booking",
      },
    ],
    IsHRMSMandatory: false,
  };
}

/** Paid-baggage SSR echoed back on the booking, one row per pax per leg. */
function bookedSSR(s: RunState, withPaxId: boolean): Json[] {
  const rows: Json[] = [];
  const chosen = BAGS[0]; // the client picks the cheapest paid bag
  s.legs.forEach((leg) =>
    s.travellers.forEach((t) => {
      const isInfant = t.PTC === "INF";
      const paid = s.c.baggage && !isInfant;
      rows.push({
        PTC: t.PTC,
        ...(withPaxId ? { PaxId: String(t.ID) } : {}),
        FUID: String(leg.fuid),
        Code: paid ? chosen.Code : "BAG",
        Description: paid ? chosen.Description : isInfant ? "0 Kg, 7 Kg" : "15 Kg, 7 Kg",
        PieceDescription: "",
        SSRCategory: null,
        Charge: paid ? chosen.Charge : 0,
        Discount: 0,
        Type: "2",
        SSRUrl: null,
        VAT: 0,
        EMDNumber: "",
        ConfirmedFreeSeat: "",
        SectorId: 27742 + leg.fuid,
        AdditionalInfo: null,
      });
    }),
  );
  return rows;
}

function createItineraryResponse(s: RunState, body: Json): Json {
  s.travellers = (body.Travellers as Json[]) || [];
  s.contact = (body.ContactInfo as Json) || {};
  s.ssrRequested = Number(body.SSRAmount || 0);
  const gross = s.legs.reduce((a, l) => a + legTotals(l.spec.routing).gross, 0);
  const net = Number(body.NetAmount);
  return {
    TUI: s.itinTui,
    Mode: null,
    TransactionID: s.transactionId,
    CurrencyCode: "INR",
    ADT: 2,
    CHD: 2,
    INF: 2,
    YTH: 0,
    NetAmount: net,
    AirlineNetFare: net,
    SSRAmount: s.ssrRequested,
    CrossSellAmount: 0,
    GrossAmount: gross + s.ssrRequested,
    Trips: s.legs.map((leg) => ({
      Journey: [
        {
          Provider: "6E",
          Stops: String(leg.spec.stops),
          Offer: "",
          OrderID: leg.fuid - 1,
          GrossFare: legTotals(leg.spec.routing).gross,
          NetFare: legTotals(leg.spec.routing).net,
          Promo: "ATFLY",
          WPRegionCode: null,
          Segments: [pricedSegment(leg)],
          Notices: null,
        },
      ],
    })),
    Rules: s.legs.map(cancellationRule),
    SSR: bookedSSR(s, true),
    SSRChange: null,
    CrossSell: null,
    Auxiliaries: null,
    Hold: false,
    CeilingInfo: null,
    EnableFareMasking: false,
    TripID: "",
    Code: "200",
    Msg: ["Success"],
    success: true,
  };
}

function startPayResponse(s: RunState, body: Json): Json {
  s.startPayCalls++;
  const tui = `${s.itinTui.split("|")[0]}|${guid(`pay-${s.c.id}-${s.startPayCalls}`)}|${s.runStamp}`;
  return {
    TUI: tui,
    Code: "6033",
    Msg: ["BOOKING  INPROGRESS !"],
    PaymentID: null,
    TransactionID: s.transactionId,
    RedirectMode: "R",
    PostData: null,
    CRSPNR: null,
    BookStatus: null,
    TUTransactionID: 0,
    ClientID: "FVI6V120g22Ei5ztGK0FIQ==",
    GatewayCode: "",
    RedirectUrl: ` https://b2bapiportal.benzyinfotech.com/flight/confirmation/${tui}/${s.transactionId}`,
    CFOrderId: null,
    BookingType: body.BookingType,
    success: true,
  };
}

function itineraryStatusResponse(s: RunState): Json {
  return {
    TUI: `${s.itinTui.split("|")[0]}|${guid(`sts-${s.c.id}-${s.startPayCalls}`)}|${s.runStamp}`,
    transactionID: String(s.transactionId),
    Code: "200",
    Msg: ["Success"],
    CurrentStatus: s.startPayCalls > 1 ? "TO0" : "HO0",
    PaymentStatus: "Success",
    currentStatusSuccess: true,
    retry: false,
  };
}

function retrieveBookingResponse(s: RunState): Json {
  const ticketed = s.startPayCalls > 1;
  const status = ticketed ? "TO0" : "HO0";
  const gross = s.legs.reduce((a, l) => a + legTotals(l.spec.routing).gross, 0);
  const net = s.legs.reduce((a, l) => a + legTotals(l.spec.routing).net, 0);
  const paxId = (i: number) => 31699 + i;

  return {
    TUI: `${s.itinTui.split("|")[0]}|${guid(`rb-${s.c.id}-${s.startPayCalls}`)}|${s.runStamp}`,
    TransactionID: s.transactionId,
    NetAmount: net,
    CumulativeNetAmount: 0,
    AirlineNetFare: net,
    SSRAmount: s.ssrRequested,
    SSRCommission: 0,
    CrossSellAmount: 0,
    GrossAmount: gross + s.ssrRequested,
    CancellationID: 0,
    RefundAmount: null,
    AirlineRefundAmount: null,
    ATOServiceCharge: null,
    SectorType: "D",
    ServiceType: "FLT",
    RefServiceType: "FLT",
    From: s.from,
    To: s.to,
    FromName: airportName(s.from),
    ToName: airportName(s.to),
    OnwardDate: s.onwardDate,
    ReturnDate: s.returnDate || "0001-01-01",
    GateWayCode: "",
    GateWayCharge: 0,
    PaymentStatus: "I8",
    PaymentTransactionStatus: null,
    Status: status,
    FinYearID: "18",
    FareType: "N",
    BookingDate: new Date().toISOString().slice(0, 19),
    ItineraryType: null,
    ActualNetAmount: 0,
    ExchangeRate: 0,
    ItiPaymentStatus: null,
    DRefNo: "",
    OfflineAgentCode: "",
    BookingType: ticketed ? "H" : "HB",
    HoldInfo: ticketed ? null : "E|10:01|10.00|SE|EE",
    TripType: s.c.tripType,
    PGDescription: "Payment Success",
    CustomerFare: gross + s.ssrRequested,
    AmendmentAmount: 0,
    RTBCancellationCharge: 0,
    RTBPaymentStatus: "",
    Hold: false,
    EnableFareMasking: false,
    HoldDuration: 0,
    CeilingInfo: null,
    Invoice: "",
    IsStudentFare: false,
    IsSeniorCitizen: false,
    IsLabourFare: false,
    IsITFare: false,
    IsVFRFare: false,
    IsBilled: false,
    Promo: [{ Code: "", Amount: 0, EmployeeID: null, ConvenienceFee: 0 }],
    CrossSell: [],
    MCReference: [],
    Trips: s.legs.map((leg) => ({
      Journey: [
        {
          CancelRequestType: "",
          Provider: "6E",
          OrderID: leg.fuid,
          Stops: leg.spec.stops,
          GrossFare: legTotals(leg.spec.routing).gross,
          NetFare: legTotals(leg.spec.routing).net,
          RefundAmount: null,
          AirlineRefundAmount: null,
          ATOServiceCharge: null,
          Status: status,
          RefTransactionID: 0,
          AirlineContact: null,
          WebCheckinUrl: null,
          BaggagePolicyUrl: null,
          Duration: leg.spec.duration,
          Segments: [
            {
              TourCode: "",
              Flight: {
                ...(pricedSegment(leg).Flight as Json),
                APNR: s.pnr,
                CRSPNR: s.pnr,
                AirlinePNR: s.pnr,
                TicketInfo: s.travellers.map((t, i) => ({
                  PaxID: paxId(i),
                  TicketNo: "",
                  Status: status,
                  IsWheelChairEnabled: false,
                })),
                Hops: [],
                RefundSummary: [],
                FCType: "",
                FareComponentSector: "",
                CarbonEmissions: 0,
                OrderDetails: "",
              },
              Fares: fareBlock(leg.spec.routing),
            },
          ],
          Notices: [],
          Reissue: [{ ReissueType: null, Paxwise: false, Journeywise: false, Cabinwise: false, Rerouting: false }],
          WPRegionCode: "",
        },
      ],
    })),
    Rules: s.legs.map(cancellationRule),
    SSR: bookedSSR(s, true),
    Pax: s.travellers.map((t, i) => ({
      ID: paxId(i),
      PaxID: t.ID,
      Title: t.Title,
      FName: t.FName,
      LName: t.LName,
      Age: String(t.Age),
      DOB: t.DOB,
      Gender: t.Gender,
      PTC: t.PTC,
      Nationality: t.Nationality,
      PassportNo: t.PassportNo,
      PLI: t.PLI,
      DOE: t.PDOE,
      DOI: "0001-01-01",
      VisaType: t.VisaType,
      FFNumber: "",
      IdType: "",
      WPPaxID: "",
      EMPID: "0",
      EmployeeRefNo: null,
    })),
    ContactInfo: [
      {
        Title: "MR",
        FName: s.contact.FName,
        LName: s.contact.LName,
        MobileCountryCode: "",
        Mobile: s.contact.Mobile,
        Phone: s.contact.Mobile,
        Email: s.contact.Email,
        Address: s.contact.Address,
        CountryCode: s.contact.CountryCode,
        State: s.contact.State,
        City: s.contact.City,
        PIN: s.contact.PIN,
        GSTCompanyName: "",
        GSTTIN: "",
        GSTMobile: "",
        GSTEmail: s.contact.Email,
        UpdateProfile: false,
        IsGuest: false,
        PreferredLanguage: "",
        ReturnContactNo: "",
        DestMob: "",
        DestMobCountryCode: "",
        ReturnMobileCountryCode: "",
      },
    ],
    WebCheckInInfo: s.legs.flatMap((leg) => s.travellers.map((t) => ({ FUID: String(leg.fuid), PaxID: t.ID, IsWebCheckInCompleted: false }))),
    PLP: [],
    SeatMap: [],
    Auxiliaries: [{ Code: "", EmployeeID: null, Amount: 0 }],
    PaymentSummary: null,
    LinkedItn: null,
    LinkedItn_PBSSR: null,
    Remarks: [{ RecievedDate: new Date().toISOString().slice(0, 16), Remarks: "", Status: "", RecievedFrom: "Benzy Infotech" }],
    TravellerCheckList: null,
    TravellerDocumentList: [],
    Attachment: null,
    ApprovalStatus: null,
    RejectedApprover: "",
    RejectedReason: "",
    ApprovalEmployeeList: null,
    BookingTimeRemarks: "",
    BillingType: "",
    TripPurposeDescription: "",
    PaymentType: "Deposit",
    Code: "200",
    Msg: ["Success"],
    success: true,
  };
}

/* ------------------------------------------------------------------ *
 * Transport
 * ------------------------------------------------------------------ */

/**
 * Install a fetch that answers Benzy endpoints from the reference data above.
 * Returns a restore function.
 */
export function installReferenceTransport(c: RefCase, now: Date): () => void {
  const real = globalThis.fetch;
  const runStamp = tuiStamp(now);
  const state: RunState = {
    c,
    runStamp,
    masterTui: `${guid(`m-${c.id}`)}|${guid(`m2-${c.id}`)}|${runStamp}`,
    repricedTui: `${guid(`m-${c.id}`)}|${guid(`p-${c.id}`)}|${runStamp}`,
    itinTui: `${guid(`m-${c.id}`)}|${guid(`i-${c.id}`)}|${runStamp}`,
    transactionId: 250037122 + c.id,
    pnr: `XR${c.id}INF`,
    from: "",
    to: "",
    onwardDate: "",
    returnDate: "",
    legs: [],
    travellers: [],
    contact: {},
    ssrRequested: 0,
    startPayCalls: 0,
  };

  const routes: [RegExp, (body: Json) => Json][] = [
    [/\/Utils\/Signature$/i, () => signatureResponse(state)],
    [/\/flights\/ExpressSearch$/i, (b) => expressSearchResponse(state, b)],
    [/\/Utils\/WebSettings$/i, () => webSettingsResponse(state)],
    [/\/flights\/GetExpSearch$/i, () => getExpSearchResponse(state)],
    [/\/Flights\/SSR$/i, (b) => ssrResponse(state, b)],
    [/\/flights\/SmartPricer$/i, (b) => smartPricerResponse(state, b)],
    [/\/Flights\/GetSPricer$/i, () => getSPricerResponse(state)],
    [/\/Utils\/GetTravelCheckList$/i, () => travelCheckListResponse(state)],
    [/\/Flights\/CreateItinerary$/i, (b) => createItineraryResponse(state, b)],
    [/\/Payment\/StartPay$/i, (b) => startPayResponse(state, b)],
    [/\/Payment\/GetItineraryStatus$/i, () => itineraryStatusResponse(state)],
    [/\/Utils\/RetrieveBooking$/i, () => retrieveBookingResponse(state)],
  ];

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : (input as Request).url;
    const route = routes.find(([re]) => re.test(new URL(url).pathname));
    if (!route) throw new Error(`No reference response registered for ${url}`);
    const body = init?.body ? (JSON.parse(String(init.body)) as Json) : {};
    return new Response(JSON.stringify(route[1](body)), { status: 200, headers: { "content-type": "application/json" } });
  }) as typeof fetch;

  return () => {
    globalThis.fetch = real;
  };
}
