import { eq, sql } from "drizzle-orm";
import { DAY_MS, MINUTE_MS, NOTICE_VERSION, istDate, istDateTime, priceVisit, startOfDayIST } from "@/domain";
import type { DB } from "./client";
import * as t from "./schema";
import { newId, newToken } from "../store/ids";
import { DEMO } from "../demo";

/** Small deterministic PRNG so the demo looks the same on every machine. */
function prng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let x = s;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

export { DEMO };

const WOMEN = ["Neha", "Pooja", "Ananya", "Kavya", "Ritika", "Shruti", "Meera", "Isha", "Divya", "Aditi", "Sakshi", "Tanvi", "Nidhi", "Komal", "Payal", "Swati", "Riya", "Simran", "Bhavna", "Jyoti"];
const MEN = ["Rohan", "Aman", "Vikas", "Karan", "Saurabh", "Nikhil", "Rahul", "Ankit", "Harsh", "Yash", "Deepak", "Manish", "Varun", "Gaurav", "Mohit", "Siddharth", "Abhishek", "Pranav", "Tushar", "Kunal"];
const SURNAMES = ["Sharma", "Jain", "Agrawal", "Verma", "Patel", "Joshi", "Malviya", "Chouhan", "Solanki", "Tiwari", "Dubey", "Gupta", "Rathore", "Khandelwal", "Pandey", "Mishra", "Yadav", "Saxena", "Bhatt", "Kulkarni"];

export async function seedIfEmpty(db: DB) {
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(t.orgs);
  if (n === 0) await seedDemo(db);
}

/** Remove the demo salon (cascades to all its rows) and seed it again. */
export async function resetDemo(db: DB) {
  await db.delete(t.otpCodes).where(sql`phone in (${DEMO.ownerPhone}, ${DEMO.staffPhone})`);
  await db.delete(t.orgs).where(eq(t.orgs.isDemo, true));
  await seedDemo(db);
}

export async function seedDemo(db: DB, nowMs = Date.now()) {
  const rand = prng(20261125);
  const pick = <T>(xs: readonly T[]) => xs[Math.floor(rand() * xs.length)];
  const orgId = newId();
  const OPEN = 600; // 10:00
  const CLOSE = 1260; // 21:00
  await db.insert(t.orgs).values({
    id: orgId,
    name: "Kesar Glow Unisex Salon (Demo)",
    city: "Indore",
    address: "Shop 14, Scheme 54, Vijay Nagar, Indore 452010",
    chairs: 4,
    openMinute: OPEN,
    closeMinute: CLOSE,
    gstPercent: 18,
    gstin: "23ABCDE1234F1Z5 (demo)",
    upiVpa: "kesarglow.demo@upi",
    googleReviewUrl: "https://search.google.com/local/writereview?placeid=DEMO-PLACE-ID",
    followUpOffer: "Show this message for a free head massage with any service",
    qrToken: DEMO.qrToken,
    isDemo: true,
    createdAt: new Date(nowMs - 120 * DAY_MS),
  });
  await db.insert(t.users).values([
    { id: newId(), orgId, phone: DEMO.ownerPhone, name: "Rakesh Jain", role: "owner" },
    { id: newId(), orgId, phone: DEMO.staffPhone, name: "Komal Verma", role: "staff" },
  ]);

  const stylistRows = [
    { id: newId(), orgId, name: "Imran Qureshi", phone: "+919826000011", title: "Senior barber", commissionType: "percent" as const, commissionValue: 30, packagePercent: 5 },
    { id: newId(), orgId, name: "Priya Nair", phone: "+919826000012", title: "Hair and colour specialist", commissionType: "percent" as const, commissionValue: 35, packagePercent: 5 },
    { id: newId(), orgId, name: "Sneha Patil", phone: "+919826000013", title: "Skin and nails", commissionType: "percent" as const, commissionValue: 25, packagePercent: 10 },
    { id: newId(), orgId, name: "Arjun Mehta", phone: "+919826000014", title: "Barber", commissionType: "flat" as const, commissionValue: 8000, packagePercent: 5 },
  ];
  await db.insert(t.stylists).values(stylistRows);
  const [imran, priya, sneha, arjun] = stylistRows;

  const svc = (name: string, category: string, gender: "women" | "men" | "unisex", rupees: number, durationMin: number, cycleDays: number, sort: number, commissionOverridePercent: number | null = null) => ({
    id: newId(),
    orgId,
    name,
    category,
    gender,
    pricePaise: rupees * 100,
    durationMin,
    cycleDays,
    sort,
    commissionOverridePercent,
  });
  const S = {
    menCut: svc("Men's haircut", "Hair", "men", 300, 30, 28, 1),
    beard: svc("Beard trim and shape", "Grooming", "men", 150, 15, 14, 2),
    womenCut: svc("Women's haircut", "Hair", "women", 700, 45, 45, 3),
    colour: svc("Global hair colour", "Colour", "unisex", 2500, 120, 50, 4, 15),
    roots: svc("Root touch-up", "Colour", "unisex", 1200, 60, 42, 5),
    spa: svc("Hair spa", "Hair", "unisex", 1500, 60, 30, 6),
    facial: svc("Classic facial", "Skin", "unisex", 1200, 60, 30, 7),
    wax: svc("Full-arm waxing", "Skin", "women", 500, 30, 21, 8),
    mani: svc("Manicure", "Nails", "unisex", 600, 40, 21, 9),
    massage: svc("Head massage", "Wellness", "unisex", 400, 20, 0, 10),
  };
  await db.insert(t.services).values(Object.values(S));

  const facialPack = { id: newId(), orgId, name: "6 facials pack", serviceId: S.facial.id, sessions: 6, pricePaise: 600_000, validityDays: 180 };
  const beardPack = { id: newId(), orgId, name: "Beard club (4 trims)", serviceId: S.beard.id, sessions: 4, pricePaise: 48_000, validityDays: 90 };
  await db.insert(t.packages).values([facialPack, beardPack]);
  const gold = { id: newId(), orgId, name: "Glow Gold membership", pricePaise: 500_000, walletCreditPaise: 550_000, discountPercent: 10, validityDays: 365 };
  await db.insert(t.membershipPlans).values(gold);

  // Clients and their usual routine.
  type Client = { id: string; name: string; phone: string; gender: "women" | "men"; routine: (typeof S.menCut)[]; stylist: typeof imran; marketing: boolean; lapsed: boolean; oneOff: boolean };
  const clients: Client[] = [];
  const usedPhones = new Set<string>();
  // 260 regulars on a service cycle, then 80 first-timers with a single recent visit.
  for (let i = 0; i < 340; i++) {
    const gender = i % 2 === 0 ? "women" : "men";
    const first = gender === "women" ? WOMEN[(i / 2) % WOMEN.length | 0] : MEN[((i - 1) / 2) % MEN.length | 0];
    const name = `${first} ${SURNAMES[(Math.floor(i / 40) * 7 + i) % SURNAMES.length]}`;
    let phone = "";
    do phone = `+91${pick(["98", "97", "99", "88", "70", "62"])}${String(Math.floor(rand() * 1e8)).padStart(8, "0")}`;
    while (usedPhones.has(phone) || phone.startsWith("+9198260000"));
    usedPhones.add(phone);
    const routine =
      gender === "men"
        ? pick([[S.menCut], [S.menCut, S.beard], [S.beard], [S.menCut, S.massage], [S.menCut, S.facial]])
        : pick([[S.womenCut], [S.facial], [S.wax, S.mani], [S.roots], [S.womenCut, S.spa], [S.colour], [S.facial, S.wax]]);
    const stylist = gender === "men" ? pick([imran, arjun, imran]) : routine.some((r) => r.category === "Skin" || r.category === "Nails") ? sneha : priya;
    const oneOff = i >= 260;
    clients.push({ id: newId(), name, phone, gender, routine, stylist, marketing: rand() < (oneOff ? 0.5 : 0.72), lapsed: !oneOff && rand() < 0.25, oneOff });
  }
  await db.insert(t.customers).values(clients.map((c) => ({ id: c.id, orgId, phone: c.phone, name: c.name, notes: "", createdAt: new Date(nowMs - 150 * DAY_MS) })));
  await db.insert(t.consentRecords).values(
    clients.flatMap((c) => [
      { id: newId(), orgId, customerId: c.id, purpose: "service_updates" as const, granted: true, noticeVersion: NOTICE_VERSION, channel: "qr" as const, createdAt: new Date(nowMs - 120 * DAY_MS) },
      ...(c.marketing ? [{ id: newId(), orgId, customerId: c.id, purpose: "marketing" as const, granted: true, noticeVersion: NOTICE_VERSION, channel: "qr" as const, createdAt: new Date(nowMs - 120 * DAY_MS) }] : []),
    ]),
  );
  const noteFor = [
    ["Allergic to ammonia-based colour. Use ammonia-free only.", clients.find((c) => c.routine.includes(S.colour))],
    ["Colour formula: 5.3 + 6.3, 20 vol, 35 min.", clients.find((c) => c.routine.includes(S.roots))],
    ["Prefers no small talk; likes a hot towel finish.", clients[1]],
  ] as const;
  for (const [notes, c] of noteFor) if (c) await db.update(t.customers).set({ notes }).where(eq(t.customers.id, c.id));

  // Packages and a membership already sold.
  const facialClient = clients.find((c) => c.routine.includes(S.facial))!;
  const goldClient = clients.find((c) => c.gender === "women" && c !== facialClient)!;
  await db.insert(t.customerPackages).values({ id: newId(), orgId, customerId: facialClient.id, packageId: facialPack.id, sessionsLeft: 4, expiresAt: new Date(nowMs + 120 * DAY_MS), soldByStylistId: sneha.id, pricePaise: facialPack.pricePaise, commission: 60_000, paymentMethod: "upi", createdAt: new Date(nowMs - 20 * DAY_MS) });
  const goldId = newId();
  await db.insert(t.memberships).values({ id: goldId, orgId, customerId: goldClient.id, planId: gold.id, walletBalancePaise: 310_000, discountPercent: 10, expiresAt: new Date(nowMs + 300 * DAY_MS), soldByStylistId: priya.id, pricePaise: gold.pricePaise, commission: 25_000, paymentMethod: "card", createdAt: new Date(nowMs - 25 * DAY_MS) });

  // Visit history over the last ~100 days, each client roughly on their cycle.
  const visitRows: (typeof t.visits.$inferInsert)[] = [];
  const lineRows: (typeof t.visitLines.$inferInsert)[] = [];
  const perClient = new Map<string, { id: string; at: number; total: number }[]>();
  let billNo = 0;
  const today = startOfDayIST(nowMs);
  for (const c of clients) {
    const cycle = Math.min(...c.routine.map((r) => r.cycleDays || 30));
    let day = c.oneOff ? -1 - Math.floor(rand() * 60) : -100 + Math.floor(rand() * cycle);
    const stopBefore = c.oneOff ? day : c.lapsed ? -(cycle + 5 + Math.floor(rand() * 20)) : -1;
    while (day <= stopBefore) {
      const minute = OPEN + 15 * Math.floor(rand() * ((CLOSE - OPEN - 120) / 15));
      const at = istDateTime(istDate(today + day * DAY_MS), minute);
      const services = c.routine.map((s) => ({ serviceId: s.id, name: s.name, price: s.pricePaise, commissionOverridePercent: s.commissionOverridePercent }));
      const isGold = c === goldClient && at > nowMs - 25 * DAY_MS;
      const bill = priceVisit({
        services,
        packages: [],
        membership: isGold ? { id: goldId, discountPercent: 10, walletBalance: 1e9, expiresAt: nowMs + DAY_MS } : null,
        gstPercent: 18,
        rule: { type: c.stylist.commissionType, serviceValue: c.stylist.commissionValue, packagePercent: c.stylist.packagePercent },
        method: isGold ? "wallet" : "cash",
        now: at,
      });
      const id = newId();
      billNo += 1;
      visitRows.push({
        id,
        orgId,
        customerId: c.id,
        stylistId: c.stylist.id,
        subtotal: bill.subtotal,
        discount: bill.discount,
        taxable: bill.taxable,
        gst: bill.gst,
        total: bill.total,
        commission: bill.commission,
        serviceMinutes: c.routine.reduce((s, r) => s + r.durationMin, 0),
        paymentMethod: isGold ? "wallet" : pick(["cash", "upi", "upi", "upi", "card"] as const),
        billNo,
        createdAt: new Date(at),
      });
      for (const l of bill.lines) lineRows.push({ id: newId(), orgId, visitId: id, ...l });
      perClient.set(c.id, [...(perClient.get(c.id) ?? []), { id, at, total: bill.total }]);
      day += Math.max(7, cycle + Math.floor(rand() * 11) - 4);
    }
  }
  visitRows.sort((a, b) => (a.createdAt as Date).getTime() - (b.createdAt as Date).getTime()).forEach((v, i) => (v.billNo = i + 1));
  for (let i = 0; i < visitRows.length; i += 200) await db.insert(t.visits).values(visitRows.slice(i, i + 200));
  for (let i = 0; i < lineRows.length; i += 300) await db.insert(t.visitLines).values(lineRows.slice(i, i + 300));

  // Past nudges that brought clients back (recovered revenue), with their outbox messages.
  const recoveredClients = clients.filter((c) => c.marketing && (perClient.get(c.id)?.length ?? 0) >= 3).slice(0, 9);
  for (const c of recoveredClients) {
    const vs = perClient.get(c.id)!;
    const back = vs[vs.length - 1];
    if (back.at < nowMs - 28 * DAY_MS) continue;
    const prev = vs[vs.length - 2];
    const sentAt = new Date(back.at - (2 + Math.floor(rand() * 6)) * DAY_MS);
    const outboxId = newId();
    await db.insert(t.outbox).values({ id: outboxId, orgId, customerId: c.id, channel: "whatsapp", purpose: "marketing", template: "rebook_first", toPhone: c.phone, body: `Hi ${c.name.split(" ")[0]}, time for your next ${c.routine[0].name.toLowerCase()} at Kesar Glow? Book your slot: (demo link) Reply STOP to opt out.`, createdAt: sentAt });
    await db.insert(t.rebookNudges).values({ id: newId(), orgId, customerId: c.id, serviceId: c.routine[0].id, lastVisitId: prev.id, kind: "first", dueAt: sentAt, sentAt, outboxId, bookedVisitId: back.id, recoveredPaise: back.total });
  }

  // Review requests for recent visits; most answered.
  const comments = ["Loved the cut, Imran is the best!", "Very clean salon and on time.", "Facial was relaxing.", "Waited 25 minutes past my slot.", "Colour came out a shade darker than I asked.", "Great service, will come again."];
  const recent = visitRows.filter((v) => (v.createdAt as Date).getTime() > nowMs - 30 * DAY_MS);
  const reviewRows = recent.filter(() => rand() < 0.55).map((v) => {
    const answered = rand() < 0.7;
    const rating = answered ? pick([5, 5, 5, 5, 5, 4, 4, 4, 4, 4, 4, 3, 2]) : null;
    return {
      id: newId(),
      orgId,
      visitId: v.id!,
      customerId: v.customerId,
      token: newToken(),
      rating,
      comment: rating ? (rating >= 4 ? pick(comments.slice(0, 3).concat(comments[5])) : pick(comments.slice(3, 5))) : "",
      route: rating === null ? null : rating >= 4 ? ("google" as const) : ("private" as const),
      requestedAt: v.createdAt as Date,
      answeredAt: rating ? new Date((v.createdAt as Date).getTime() + 3 * 3600_000) : null,
    };
  });
  if (reviewRows.length) await db.insert(t.reviews).values(reviewRows);

  // Today (or tomorrow, if the salon has closed): a few bookings in the diary.
  const nowMinute = Math.floor((nowMs - today) / MINUTE_MS);
  const diaryDay = nowMinute > CLOSE - 120 ? istDate(today + DAY_MS) : istDate(today);
  const baseMinute = diaryDay === istDate(today) ? Math.max(OPEN, Math.ceil((nowMinute + 30) / 15) * 15) : OPEN + 60;
  const bookings = [
    { c: clients[2], st: priya, s: S.womenCut, offset: 0 },
    { c: clients[3], st: imran, s: S.menCut, offset: 30 },
    { c: clients[6], st: sneha, s: S.facial, offset: 60 },
    { c: clients[9], st: arjun, s: S.beard, offset: 90 },
  ];
  for (const b of bookings) {
    const m = baseMinute + b.offset;
    if (m + b.s.durationMin > CLOSE) continue;
    const start = istDateTime(diaryDay, m);
    await db.insert(t.appointments).values({ id: newId(), orgId, customerId: b.c.id, stylistId: b.st.id, serviceId: b.s.id, startAt: new Date(start), endAt: new Date(start + b.s.durationMin * MINUTE_MS), status: "booked", source: pick(["qr", "link", "phone"] as const), publicToken: newToken(), createdAt: new Date(nowMs - 2 * DAY_MS) });
  }

  // A live walk-in queue.
  const walkIns = [
    { c: clients[11], s: S.menCut, status: "in_chair" as const, stylist: imran.id, ago: 25 },
    { c: clients[13], s: S.menCut, status: "waiting" as const, stylist: null, ago: 18 },
    { c: clients[14], s: S.facial, status: "waiting" as const, stylist: null, ago: 12 },
    { c: clients[15], s: S.beard, status: "waiting" as const, stylist: null, ago: 5 },
  ];
  let ticket = 0;
  for (const w of walkIns) {
    ticket += 1;
    await db.insert(t.queueEntries).values({ id: newId(), orgId, customerId: w.c.id, serviceId: w.s.id, preferredStylistId: null, stylistId: w.stylist, status: w.status, ticketNo: ticket, publicToken: newToken(), joinedAt: new Date(nowMs - w.ago * MINUTE_MS), startedAt: w.status === "in_chair" ? new Date(nowMs - 10 * MINUTE_MS) : null });
  }
  return { orgId };
}
