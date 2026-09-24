Southeast Asian users, Thailand especially, arrive mobile-first, trust differently, pay through rails the Western web ignores (PromptPay, cash on delivery, mobile banking, e-wallets), and read denser interfaces comfortably. A design that is excellent by Western norms can still convert poorly here because the trust cues, payment flow, and density expectations are wrong. This command adapts an interface to SEA / Thai norms; it complements `/tcher audit` (a11y, perf) and `/tcher responsive` (breakpoints) with the regional layer those don't cover.

---

## Register

Brand (marketing, landing, campaign): trust signals are the conversion lever. Lead with social proof and a real, reachable contact.

Product (app, dashboard, checkout): payment UX, the mobile thumb-zone, sensible information density, and locale-correct forms are where it lives or dies.

See [brand.md](brand.md) / [product.md](product.md).

---

## What's different in SEA

- **Mobile-first, often mobile-only.** A large share of users came online through a phone and never used the desktop site. Thailand's mobile share of web traffic is among the highest in the world. Design the phone view as the primary, not the fallback.
- **Trust is earned with social proof and a reachable human,** not brand polish alone. Institutional trust runs lower; visible proof (counts, reviews, a real contact, COD) carries the sale.
- **Payment is not card-first.** PromptPay QR, cash on delivery, mobile banking, and e-wallets dominate; credit-card penetration is lower than in the West.
- **Density is comfortable, not clutter.** Thai and SEA users navigate dense, information-rich screens fluently and often expect them (Shopee, Lazada, LINE MAN, Pantip). The Western whitespace-maximalist default is not a universal good here.
- **Locale is specific.** Thai addresses cascade (province → district → subdistrict → postcode), dates may use the Buddhist Era, identity is phone-number-first.

## Assess

- Is the primary CTA reachable by a thumb on a phone, or stranded in a top corner?
- Are there trust signals above the fold (real numbers, reviews, a contactable channel)?
- Does checkout offer PromptPay / COD / wallets, or only a credit-card form?
- For a commerce or comparison surface, is it information-rich enough, or stripped to Western minimalism that hides options and proof?
- Do the forms assume a Western address and email-first identity?
- What is page weight and load like on a mid-range Android over mobile data?

## Adapt

### Trust signals
SEA users verify before they buy. Surface, honestly:
- **A real, reachable contact**: a visible phone number or chat in the header or footer. A messaging-app channel (LINE is common in Thailand) is a fine option but not required; the point is that a human is reachable, not which app.
- **Social proof**: customer counts ("ลูกค้ากว่า 10,000 ราย"), star ratings with review counts, recent-purchase or follower counts. Real, not invented.
- **Legitimacy badges**: DBD Registered (จดทะเบียนพาณิชย์อิเล็กทรอนิกส์), COD availability, secure-payment marks, money-back terms, a physical address. Real team / store / product photos over stock.

### Payment UX
Lead with the rails people actually use; don't make card the only option.
- **PromptPay QR**: generate an EMVCo QR with the amount embedded. Show it large, with the amount, a countdown, and a clear "I've paid / upload slip" path; auto-confirm via the gateway webhook when possible. This is the dominant online payment.
- **COD (เก็บเงินปลายทาง)**: still huge, especially outside Bangkok; offer it prominently. It doubles as a trust mechanism.
- **Mobile banking & wallets**: deep-link or QR for K PLUS, SCB Easy, Krungthai NEXT; TrueMoney Wallet, Rabbit LINE Pay, ShopeePay, GrabPay.
- **Installments (ผ่อน 0%)** for higher-ticket items: a real conversion lever.
- **Slip upload**: many merchants confirm by a user-uploaded transfer slip; design that step (or a slip-verification API) when no live gateway is wired.

### Information density
The Western whitespace-maximalist default is not a universal good. Thai and SEA users read dense, information-rich interfaces comfortably and often expect them: Shopee, Lazada, LINE MAN, and Pantip pack categories, prices, badges, ratings, and promotions onto one screen and convert well. For commerce, marketplace, deals, and consumer-utility surfaces:
- Don't strip the surface to airy minimalism "for taste". Thinning out options, prices, and proof can lower perceived value and hide what users came to compare.
- Show more entry points and more per card (price, rating, sold count, discount, shipping) where the user is shopping or comparing.
- Density is not clutter. It still needs a strong grid, consistent hierarchy, scannable grouping, and tap targets that meet the size rules. Dense-and-organized (Shopee) beats sparse-and-vague.
- Judge by surface: a luxury or single-product brand page can still be spacious; a marketplace, deal feed, or super-app home should embrace density.

This is the one place where the usual reflex to add whitespace and simplify (see `/tcher trim`, `/tcher calm`) can be wrong for the audience. Match density to what the user is doing, not to a Western aesthetic.

### Mobile-first & thumb zone
- Put primary actions in the bottom third (bottom bar, bottom sheet, sticky CTA) where a thumb reaches one-handed; don't strand the main action in a top corner.
- Generous tap targets and spacing (this also helps Thai legibility).
- Budget for mid / low-end Android on mobile data: small payloads, lazy media, fast first paint. Many users watch their MB.
- Expect social-commerce entry (Facebook / IG / TikTok / LINE), not just direct web visits; the landing must make sense cold.

### Locale
- **Thai address**: cascading selects, province → district (อำเภอ / เขต) → subdistrict (ตำบล / แขวง) with postcode auto-fill; minimize free typing.
- **Identity phone-first**: SMS OTP over email where it fits.
- **Dates / currency**: Buddhist Era (พ.ศ. = ค.ศ. + 543) in formal contexts; ฿ / บาท, usually no decimals in casual display.

## Verify

- The primary action is thumb-reachable on a 390px-wide phone.
- A first-time visitor sees proof and a reachable contact without scrolling far.
- Checkout completes with PromptPay or COD without a credit card.
- A commerce or comparison surface stays information-rich and scannable, not stripped to Western minimalism.
- The address form matches Thai structure and doesn't force Western fields.
- The page is usable on a throttled mobile connection.

`/tcher audit` covers the a11y / perf / anti-pattern layer and `/tcher responsive` the breakpoints; this command is the regional-norms pass on top.
