# Activar pagos con Stripe

Memorias Vivas cobra un pago único de **$39 USD por cada álbum**. El cliente
inicia sesión, paga en la página segura de Stripe y el pago confirmado canjea
un álbum.

## 1. Crear el producto

En Stripe, crea un producto llamado `Memorias Vivas · Álbum de evento` con un
precio único de `39.00 USD`. Copia su identificador `price_...`.

## 2. Variables en Vercel

En **Vercel → Project → Settings → Environment Variables**, agrega estas tres
variables para Production, Preview y Development:

```text
STRIPE_SECRET_KEY=sk_test_...          # primero prueba; luego sk_live_...
STRIPE_PRICE_ID=price_...
NEXT_PUBLIC_SITE_URL=https://memorias-ten.vercel.app
```

No pegues ninguna clave en GitHub ni en un chat.

## 3. Webhook

En **Stripe → Developers → Webhooks**, crea un endpoint:

```text
https://memorias-ten.vercel.app/api/stripe/webhook
```

Selecciona el evento `checkout.session.completed`. Copia el secreto `whsec_...`
en Vercel como:

```text
STRIPE_WEBHOOK_SECRET=whsec_...
```

## 4. Preparar la base de datos

Después del despliegue, visita una vez estando conectada como administradora:

```text
https://memorias-ten.vercel.app/api/setup
```

Eso crea la tabla de pagos. Después prueba con Stripe en modo test antes de
cambiar `sk_test_...` por `sk_live_...`.
