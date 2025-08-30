export default function ClientReviewForm({ clientId, orderId, onSuccess }) {
  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        alert(`Avaliação do cliente ${clientId} enviada!`);
        onSuccess?.();
      }}
    >
      <label>
        Nota:
        <input type="number" min="1" max="5" defaultValue={5} />
      </label>
      <button type="submit">Enviar avaliação cliente</button>
    </form>
  );
}
