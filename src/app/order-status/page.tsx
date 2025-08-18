// //order-status/page.tsx

// 'use client';
// import { useEffect, useState } from 'react';
// import { useSearchParams } from 'next/navigation';
// import { useBasketStore } from '../store/basketStore';

// export default function StatusPage() {
//   const searchParams = useSearchParams();
//   const success = searchParams.get("success");
//   const sessionId = searchParams.get("session_id");
//   const [loading, setLoading] = useState(true);
//   const [message, setMessage] = useState("Processing your order...");
//   const clearBasket = useBasketStore(state => state.clearBasket);

//   useEffect(() => {
//     if (success === "false") {
//       setMessage("Payment was canceled.");
//       setLoading(false);
//       return;
//     }

//     if (success === "true" && sessionId) {
//       setLoading(true);

//       // Fetch session details and create order
//       fetch('/api/orders/confirm-order-data', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ sessionId }),
//       })
//         .then(res => res.json())
//         .then(async (orderData) => {
//           if (!orderData) {
//             setMessage("Failed to retrieve order details.");
//             setLoading(false);
//             return;
//           }

//           // ✅ Now call /api/orders with the data
//           const res = await fetch('/api/orders', {
//             method: 'POST',
//             headers: { 'Content-Type': 'application/json' },
//             body: JSON.stringify(orderData),
//           });

//           if (!res.ok) {
//             const err = await res.text();
//             console.error("Failed to save order:", err);
//             setMessage("Order created in Stripe but failed to save. Contact support.");
//             setLoading(false);
//             return;
//           }

//           const result = await res.json();
//           clearBasket();
//           setMessage(`Order confirmed! #${result.orderId}`);
//           setLoading(false);
//         })
//         .catch(err => {
//           console.error("Error confirming order:", err);
//           setMessage("Failed to confirm order. Please contact support.");
//           setLoading(false);
//         });
//     }
//   }, [success, sessionId, clearBasket]);

//   return (
//     <div className="p-6 text-center">
//       <h1 className="text-2xl font-bold mb-4">Order Status</h1>
//       {loading ? <p>{message}</p> : <p>{message}</p>}
//       <div className="mt-6">
//         <a href="/" className="text-blue-500 underline">Back to Home</a>
//       </div>
//     </div>
//   );
// }


'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useBasketStore } from '../store/basketStore';


export default function OrderStatusPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const success = searchParams.get('success');
  const sessionId = searchParams.get('session_id');
  const clearBasket = useBasketStore((state) => state.clearBasket);


  useEffect(() => {
    if (success === 'false') {
      alert('Payment was canceled. You can try again.');
      router.push('/checkout');
      return;
    }
    if (success === null) {
      alert('Payment was canceled. You can try again.');
      router.push('/');
      return;
    }
    if (success === 'true' && sessionId) {
      // ✅ Confirm order with backend
      fetch('/api/orders/confirm-order-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            clearBasket();
            router.push(`/orders?orderId=${data.orderId}`);
            
          } else {
            console.error('Failed to save order:', data.error);
            alert('Payment succeeded, but order could not be saved. Contact support.');
          }
        })
        .catch((err) => {
          console.error('Error confirming order:', err);
          alert('An error occurred. Please contact support with your session ID.');
        });
    }
  }, [success, sessionId, clearBasket, router]);

  return (
    <div className="p-6 text-center">
      <h1 className="text-2xl font-bold mb-4">Order Status</h1>
      <p>Processing your order...</p>
    </div>
  );
}