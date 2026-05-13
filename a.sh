curl -sS -X POST http://localhost:5173/api/sessions \
  -H 'content-type: application/json' \
  -d '{"qrURLSource":"http://localhost:3000/saizeriya3/qr?table=ba44c06e-2ae3-4c30-9d58-999093265866"}'

curl -sS -X POST http://localhost:5173/api/ucp/checkout-sessions \
  -H 'content-type: application/json' \
  -d '{"line_items":[{"item":{"id":"1110"},"quantity":2}],"currency":"JPY"}'

CREATE=$(curl -sS -X POST http://localhost:5173/api/ucp/checkout-sessions \
  -H 'content-type: application/json' \
  -d '{
    "qrURLSource": "http://localhost:3000/saizeriya3/qr?table=ba44c06e-2ae3-4c30-9d58-999093265866",
    "peopleCount": 2,
    "line_items": [
      { "item": { "id": "1110" }, "quantity": 1 }
    ],
    "currency": "JPY"
  }')


curl -sS -X POST "http://localhost:5173/api/ucp/checkout-sessions/chk_ba51b170-c8a7-4722-80c3-1f79f30aa7cd/complete" \
  -H 'content-type: application/json' \
  -d '{}'

  CREATE=$(curl -sS -X POST http://localhost:5173/api/ucp/checkout-sessions \
  -H 'content-type: application/json' \
  -d '{
    "qrURLSource": "http://localhost:3000/saizeriya3/qr?table=ba44c06e-2ae3-4c30-9d58-999093265866",
    "peopleCount": 2,
    "line_items": [
      { "item": { "id": "1301" }, "quantity": 1 }
    ],
    "currency": "JPY"
  }')curl -sS -X POST "http://localhost:5173/api/ucp/checkout-sessions/$CHECKOUT_ID/complete" \
  -H 'content-type: application/json' \
  -d '{}'

curl -sS -X POST "http://localhost:5173/api/ucp/checkout-sessions/chk_5b3277dc-937b-4b3c-93de-d5f4c8b5fad8/complete" \
  -H 'content-type: application/json' \
  -d '{}'