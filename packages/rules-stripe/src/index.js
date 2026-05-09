/* ===============================================================
   @nac-spec/rules-stripe -- pre-baked NAC.adopt rules for Stripe Elements
   ---------------------------------------------------------------
   Status: skeleton. Phase 4 of v2.0 roadmap implements full rules.

   Stripe Elements widgets to cover:
     - Card Element (number + expiry + cvc)
     - Payment Request Button
     - IBAN Element
     - SEPA Debit Element
     - Express Checkout (Apple Pay / Google Pay)
   =============================================================== */
'use strict';

module.exports = function applyStripeRules(NAC) {
  if (!NAC || !NAC.adopt) {
    throw new Error('NAC v2.0 with adopt() required');
  }

  /* Skeleton rule for Card Element. Real rules cover all widgets +
     handle iframe-isolated Elements via NAC.bridgeIframe. */
  NAC.adopt({
    selector: '[data-stripe-card-element]',
    parent: 'shell.checkout.stripe',
    derive: {
      slug: function () { return 'card-element'; },
      role: function () { return 'group'; },
      intent: function () { return 'fill'; },
      label_i18n: function (el) {
        return {
          es: 'Datos de la tarjeta',
          en: 'Card details',
          pt: 'Dados do cartao',
          fr: 'Details de la carte',
          it: 'Dati della carta',
          de: 'Kartendaten',
          ja: 'カード情報',
          zh: '卡片详情',
          hi: 'कार्ड विवरण',
          ar: 'تفاصيل البطاقة'
        };
      }
    },
    observe: true
  });

  /* Phase 4: add rules for payment-request-button, iban-element,
     sepa-debit-element, payment-element, express-checkout-element. */
};
