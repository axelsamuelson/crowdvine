import {
  LegalH2,
  LegalH3,
  LegalLink,
  LegalList,
  LegalP,
  LegalProse,
  LegalStrong,
  LegalTable,
  LegalTd,
  LegalTh,
} from "@/components/legal/legal-prose";
import type { LegalTocItem } from "@/components/legal/legal-page-layout";

/** Section headings for TOC — labels match H2 text exactly (no new copy). */
export const KOPVILLKOR_EN_TOC: LegalTocItem[] = [
  { id: "punkt-1", label: "1. About us" },
  { id: "punkt-2", label: "2. Age limit" },
  { id: "punkt-3", label: "3. How a shared pallet works" },
  { id: "punkt-4", label: "4. Prices" },
  { id: "punkt-5", label: "5. Payment" },
  { id: "punkt-6", label: "6. Order confirmation and contract" },
  { id: "punkt-7", label: "7. Delivery" },
  { id: "punkt-8", label: "8. If delivery cannot be completed" },
  { id: "punkt-9", label: "9. Right of withdrawal" },
  { id: "punkt-10", label: "10. Complaints" },
  { id: "punkt-11", label: "11. Your account" },
  { id: "punkt-12", label: "12. Personal data" },
  { id: "punkt-13", label: "13. Disputes and applicable law" },
  { id: "punkt-14", label: "14. Changes to the terms" },
];

export default function KopvillkorEnContent() {
  return (
    <LegalProse>
      <LegalH2 id="punkt-1">1. About us</LegalH2>
      <LegalP>Your counterparty when you buy on pactwines.com is:</LegalP>
      <LegalTable>
        <tbody>
          <tr>
            <LegalTh>Seller</LegalTh>
            <LegalTd>EURPACT OÜ</LegalTd>
          </tr>
          <tr>
            <LegalTh>Registration number</LegalTh>
            <LegalTd>17538270</LegalTd>
          </tr>
          <tr>
            <LegalTh>Address</LegalTh>
            <LegalTd>
              Tartu mnt 67/1-13b, Kesklinna linnaosa, 10115 Tallinn, Harju
              maakond, Estonia
            </LegalTd>
          </tr>
          <tr>
            <LegalTh>Email</LegalTh>
            <LegalTd>customer@pactwines.com</LegalTd>
          </tr>
          <tr>
            <LegalTh>
              Registered with Skatteverket (the Swedish Tax Agency) as a
              distance seller of alcohol
            </LegalTh>
            <LegalTd>[FILL IN REGISTRATION NUMBER]</LegalTd>
          </tr>
        </tbody>
      </LegalTable>
      <LegalP>
        EURPACT OÜ is an Estonian company and sells alcohol at a distance to
        consumers in Sweden. EURPACT OÜ declares and pays Swedish alcohol tax
        and Swedish VAT for each delivery.
      </LegalP>

      <LegalH2 id="punkt-2">2. Age limit</LegalH2>
      <LegalP>
        <LegalStrong>
          You must be at least 20 years old to order on pactwines.com.
        </LegalStrong>
      </LegalP>
      <LegalList>
        <li>You confirm your age when you order</li>
        <li>ID is checked on delivery</li>
        <li>
          We do not hand over goods to anyone who cannot show ID, or who is
          noticeably intoxicated
        </li>
        <li>
          Goods may not be handed over to anyone other than the person who
          placed the order
        </li>
        <li>
          If delivery cannot be completed because ID is missing or not
          accepted, see{" "}
          <LegalLink href="#punkt-8">section 8</LegalLink>
        </li>
      </LegalList>
      <LegalP>
        We do not sell to anyone we have reason to believe will pass the goods
        on to someone under 20.
      </LegalP>

      <LegalH2 id="punkt-3">3. How a shared pallet works</LegalH2>
      <LegalP>
        PACT combines several orders into one shared shipment from the
        producers in France to Sweden. That is why the wine can cost what it
        does. It also means that things work a little differently than in an
        ordinary online shop.
      </LegalP>
      <LegalP>
        <LegalStrong>Step 1. You buy.</LegalStrong> You choose wines and
        complete the purchase at checkout.{" "}
        <LegalStrong>
          The purchase is binding when you click the buy button.
        </LegalStrong>{" "}
        Your card is saved with our payment provider Stripe, but no amount is
        charged yet. You receive an order confirmation with these terms by
        email.
      </LegalP>
      <LegalP>
        <LegalStrong>Step 2. The pallet fills up.</LegalStrong> The pallet is
        virtual at first. You can see how many bottles have been ordered and
        how many are needed for the pallet to be shipped.
      </LegalP>
      <LegalP>
        <LegalStrong>
          Step 3. The pallet closes and your card is charged.
        </LegalStrong>{" "}
        The pallet closes when it has reached the threshold for shipping.{" "}
        <LegalStrong>Only then is your card charged</LegalStrong> with the
        amount shown at checkout. You receive a receipt by email.
      </LegalP>
      <LegalP>
        <LegalStrong>Step 4. Delivery.</LegalStrong> Your order is packed in
        boxes at the producers in France, transported to Sweden and delivered
        to your home with an ID check (see{" "}
        <LegalLink href="#punkt-7">section 7</LegalLink>).
      </LegalP>

      <LegalH3>Cancelling before the pallet closes</LegalH3>
      <LegalP>
        Until the pallet closes, you can{" "}
        <LegalStrong>cancel your purchase free of charge</LegalStrong>, via
        your account or by emailing customer@pactwines.com. No amount is
        charged in that case. After delivery, you also have a right of
        withdrawal under <LegalLink href="#punkt-9">section 9</LegalLink>.
      </LegalP>

      <LegalH3>If the pallet takes time to fill</LegalH3>
      <LegalP>
        There is no time limit for when the pallet has to be full.{" "}
        <LegalStrong>
          Your order stays in place until the pallet closes or until you cancel
          it yourself.
        </LegalStrong>{" "}
        You do not need to do anything to keep it. No amount is charged until
        the pallet closes. In your account you can see how close the pallet is
        to the threshold, and we email you regular updates, with a link where
        you can cancel.
      </LegalP>
      <LegalP>
        When an order is cancelled, your saved card is removed, unless you
        choose to keep it for a future purchase.
      </LegalP>

      <LegalH3>If a producer cannot deliver</LegalH3>
      <LegalP>
        Sometimes a producer cannot deliver a wine you have bought, for example
        if stock runs out after the pallet has closed. In that case the
        following applies:
      </LegalP>
      <LegalList>
        <li>
          We will first offer you an{" "}
          <LegalStrong>equivalent replacement wine</LegalStrong>
        </li>
        <li>
          The wine is replaced{" "}
          <LegalStrong>only if you accept</LegalStrong> the replacement wine
        </li>
        <li>
          If you decline, or do not accept the replacement, you get your money
          back for the wines that are not delivered —{" "}
          <LegalStrong>
            without undue delay and no later than within 14 days
          </LegalStrong>{" "}
          if you have already been charged. If you have not been charged yet,
          you will not be charged for those wines
        </li>
      </LegalList>

      <LegalH2 id="punkt-4">4. Prices</LegalH2>
      <LegalList>
        <li>
          All prices are stated in Swedish kronor and{" "}
          <LegalStrong>
            include Swedish VAT and Swedish alcohol tax
          </LegalStrong>
        </li>
        <li>
          <LegalStrong>
            The total price at checkout includes VAT and shipping. No other
            fees are added.
          </LegalStrong>
        </li>
        <li>
          The total price you see at checkout is the amount charged when the
          pallet closes. We never raise the price after your purchase.
        </li>
        <li>
          If a price is obviously wrong, we have the right to cancel the
          purchase before your card is charged. We will let you know if this
          happens.
        </li>
      </LegalList>

      <LegalH2 id="punkt-5">5. Payment</LegalH2>
      <LegalP>
        You pay by card via our payment provider Stripe. When you buy, your
        card is saved with Stripe, and{" "}
        <LegalStrong>
          you authorise us to charge the amount shown at checkout when the
          pallet closes
        </LegalStrong>
        , without you having to approve it again. No amount is charged or
        reserved before then. We do not store any card details ourselves and
        never store your full card number.
      </LegalP>
      <LegalP>
        Your bank may ask for a security verification (BankID or equivalent)
        when you buy or when your card is charged.
      </LegalP>
      <LegalP>
        <LegalStrong>If the charge does not go through</LegalStrong> when the
        pallet closes, for example because the card has expired or has
        insufficient funds, we will email you. You then have{" "}
        <LegalStrong>3 days</LegalStrong> to pay, for example with another card
        or by approving the payment via the link in the email if your bank
        requires extra verification (3D Secure). In the meantime, we will try
        again. If the payment has not gone through within 3 days, the purchase
        ends and <LegalStrong>nothing is charged</LegalStrong>.
      </LegalP>
      <LegalP>
        Payment is made in accordance with{" "}
        <LegalLink href="https://stripe.com/legal/ssa">
          Stripe&apos;s terms for the payment service
        </LegalLink>
        . These govern which payment methods can be used and how a payment is
        carried out. If you use one of Stripe&apos;s own consumer services,{" "}
        <LegalLink href="https://stripe.com/legal/consumer">
          Stripe&apos;s consumer terms
        </LegalLink>{" "}
        also apply.
      </LegalP>

      <LegalH2 id="punkt-6">6. Order confirmation and contract</LegalH2>
      <LegalList>
        <li>
          <LegalStrong>
            The purchase is binding when you click the buy button at checkout.
          </LegalStrong>{" "}
          You then receive an order confirmation by email with these terms.
        </li>
        <li>
          When the pallet closes and your card is charged, you receive a
          receipt.
        </li>
      </LegalList>

      <LegalH2 id="punkt-7">7. Delivery</LegalH2>
      <LegalList>
        <li>
          Delivery is made as home delivery with an ID check by our delivery
          partner
        </li>
        <li>
          Delivery time is normally <LegalStrong>2–3 weeks</LegalStrong> after
          the pallet has closed, and always no later than 30 days after. On
          handover, the recipient&apos;s age (20) is checked against ID
        </li>
        <li>
          If you have not received your delivery within 30 days after the
          pallet closed, you may cancel the purchase. You will then get the
          full amount back within 14 days.
        </li>
        <li>
          Stated delivery times are estimates. Transport from France may be
          affected by customs, weather and the producers&apos; capacity
        </li>
        <li>
          <LegalStrong>
            The risk for the goods passes to you only when you have received
            them.
          </LegalStrong>{" "}
          If the goods are damaged or lost in transit, we are responsible
        </li>
      </LegalList>
      <LegalP>
        If delivery is significantly delayed, you have the right to terminate
        the purchase and get your money back. Contact us at
        customer@pactwines.com.
      </LegalP>

      <LegalH2 id="punkt-8">8. If delivery cannot be completed</LegalH2>
      <LegalP>
        If you are not at home, cannot show ID or are not at least 20 years
        old, our delivery partner will make a new delivery attempt. If delivery
        cannot be completed then either, the goods are returned.
      </LegalP>
      <LegalP>
        In the event of a return, you pay the actual cost of return shipping,
        without any mark-up. If the handover is refused at the age check, we do
        not charge any fee.
      </LegalP>
      <LegalP>
        You may examine the goods in the same way as you would in a shop, but
        no more than that. If a bottle has been opened, or stored or handled in
        a way that may have damaged the wine, for example in heat or direct
        sunlight, you are responsible for the reduction in value. We may then
        make a deduction from the refund corresponding to the reduction in
        value, up to the full price of the bottle. This follows from Chapter 2,
        § 14 of lagen (2005:59) om distansavtal och avtal utanför
        affärslokaler (the Swedish Distance and Off-Premises Contracts Act).
      </LegalP>

      <LegalH2 id="punkt-9">9. Right of withdrawal</LegalH2>
      <LegalP>
        You have a 14-day right of withdrawal under lagen (2005:59) om
        distansavtal och avtal utanför affärslokaler. The withdrawal period
        starts the day after you have received the wine. If you buy several
        bottles that are delivered on different occasions, the period starts
        when you have received the last one. If you want to withdraw from the
        purchase, email customer@pactwines.com, or use the standard withdrawal
        form from Konsumentverket (the Swedish Consumer Agency), within the
        withdrawal period. Then send the goods back no later than 14 days after
        you notified us. We refund the full amount, including the original
        delivery cost for standard delivery, no later than 14 days after we
        received your notice. We may wait to make the refund until we have
        received the goods back. Return shipping and reduction in value are
        covered in <LegalLink href="#punkt-8">section 8</LegalLink>. Until the
        pallet closes, you can also cancel the purchase free of charge, see{" "}
        <LegalLink href="#punkt-3">section 3</LegalLink>.
      </LegalP>

      <LegalH2 id="punkt-10">10. Complaints</LegalH2>
      <LegalP>
        If the wine is faulty, for example corked, damaged on delivery or not
        what you ordered, you have the right to make a complaint under
        konsumentköplagen (2022:260) (the Swedish Consumer Sales Act). The
        right to complain applies for three years from delivery. Notify us
        within a reasonable time after you discover the fault. If you notify us
        within two months, this is always considered to be in time. Email
        customer@pactwines.com and feel free to attach a photo. If the fault is
        accepted, you get a new bottle, or your money back if that is not
        possible, and we pay for any return shipping. If we cannot agree, you
        can turn to Allmänna reklamationsnämnden, the Swedish National Board
        for Consumer Disputes (arn.se).
      </LegalP>

      <LegalH2 id="punkt-11">11. Your account</LegalH2>
      <LegalP>
        You are responsible for making sure that the information you provide is
        correct and for keeping your login details secure. We may suspend an
        account in the event of misuse, attempts to get around the age limit or
        resale of the goods.
      </LegalP>
      <LegalP>
        Resale of alcohol bought from us is not permitted and may be a criminal
        offence under alkohollagen (the Swedish Alcohol Act).
      </LegalP>

      <LegalH2 id="punkt-12">12. Personal data</LegalH2>
      <LegalP>
        How we process your personal data is described in our{" "}
        <LegalLink href="/integritetspolicy">privacy policy</LegalLink>.
      </LegalP>

      <LegalH2 id="punkt-13">13. Disputes and applicable law</LegalH2>
      <LegalP>
        <LegalStrong>Swedish law</LegalStrong> applies to this agreement. As a
        consumer resident in Sweden, you always have the protection provided by
        mandatory Swedish consumer protection legislation, regardless of what
        is stated here.
      </LegalP>
      <LegalP>If we cannot reach an agreement, you can turn to:</LegalP>
      <LegalList>
        <li>
          <LegalStrong>Allmänna reklamationsnämnden (ARN)</LegalStrong>,
          arn.se, Box 174, 101 23 Stockholm
        </li>
        <li>
          <LegalStrong>Konsument Europa</LegalStrong> (European Consumer Centre
          Sweden), which provides free guidance on cross-border purchases
          within the EU, and which is the right route if ARN does not consider
          the case
        </li>
      </LegalList>
      <LegalP>
        We take part in dispute resolution before ARN and follow the Board&apos;s
        recommendations.
      </LegalP>

      <LegalH2 id="punkt-14">14. Changes to the terms</LegalH2>
      <LegalP>
        The terms that applied when you made your purchase are the ones that
        apply to that purchase. Changes do not affect purchases that have
        already been made.
      </LegalP>
    </LegalProse>
  );
}
