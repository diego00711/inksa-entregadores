export default function RestaurantReviewForm({ restaurantId, orderId, onSuccess }) {
  return (
    <form onSubmit={e => { e.preventDefault(); alert(`Avaliação do restaurante ${restaurantId} enviada!`); onSuccess?.(); }}>
      <label>
        Nota:
        <input type="number" min="1" max="5" defaultValue={5} />
      </label>
      <button type="submit">Enviar avaliação restaurante</button>
    </form>
  );
}
