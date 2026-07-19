# Secure Transactions — Scope Decision (Section 2.4)

BaasKhoj deliberately has **no on-platform monetary transaction**. The product's
job is discovery and *verified contact*: a tenant finds a listing, the owner
accepts a contact request, and the two parties then connect and negotiate rent and
payment **off-platform** (in person, over the phone, or via WhatsApp). No money
moves through the application, so there is no payment amount, card, wallet, or
settlement flow for the system to process or secure.

Because of this, Section 2.4's *"where applicable"* qualifier means the secure-
transaction requirements (payment-gateway integration, transaction signing,
settlement rollback) **do not strictly apply to this product's core flow**.
Building a payment integration purely to satisfy the checklist would add a large,
sensitive attack surface (PCI scope, refund/chargeback handling, gateway secrets)
for functionality the product does not actually offer — which would be worse for
security, not better.

The `ESEWA_MERCHANT_CODE` and `KHALTI_SECRET_KEY` environment placeholders that
exist in the configuration are reserved for a **future, optional "paid listing
boost"** feature (an owner paying to promote a listing). That feature is **not
live** — no code reads or acts on those variables today. Their presence is
forward-looking scaffolding, not a half-finished or insecure integration.

In short: the absence of transaction-processing code here is a **deliberate scope
decision that matches how the product actually works**, not an oversight or a
missing security control. Should the paid-boost feature be built later, it would be
implemented against a third-party Nepali gateway (eSewa/Khalti) with server-side
verification of the payment callback, and this document would be revised
accordingly.
