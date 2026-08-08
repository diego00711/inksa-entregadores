// Entregador avalia o cliente. Padrão único do app: só estrelas + comentário
// opcional — sem tags/categorias e sem formulário retrátil. Rápido e fácil.
import React, { useState } from "react";
import { Star, Send, CheckCircle, MessageSquare } from "lucide-react";
import { postClientReview } from '../services/reviewService';

const StarRating = ({ rating, onRatingChange }) => (
  <div className="flex items-center gap-1">
    {[1, 2, 3, 4, 5].map((star) => (
      <button
        key={star}
        type="button"
        onClick={() => onRatingChange(star)}
        className="w-9 h-9 flex items-center justify-center transition-transform hover:scale-110"
        aria-label={`${star} estrela${star > 1 ? 's' : ''}`}
      >
        <Star
          className={`w-8 h-8 ${star <= rating ? "text-yellow-400" : "text-gray-300"}`}
          fill={star <= rating ? "currentColor" : "none"}
        />
      </button>
    ))}
    <span className="ml-2 text-sm font-medium text-gray-600">({rating}/5)</span>
  </div>
);

const getRatingText = (r) => (
  { 1: "Muito insatisfeito", 2: "Insatisfeito", 3: "Regular", 4: "Satisfeito", 5: "Muito satisfeito" }[r] || ""
);

const getRatingColor = (r) => (r >= 4 ? "text-green-600" : r >= 3 ? "text-yellow-600" : "text-red-600");

export default function ClientReviewForm({ clientId, orderId, onSuccess }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setSubmitError(null);
    try {
      await postClientReview({
        clientId,
        orderId,
        rating,
        comment: comment.trim(),
      });
      setSuccess(true);
      setTimeout(() => { onSuccess?.(); }, 1500);
    } catch (error) {
      setSubmitError(error.message || 'Erro ao enviar avaliação. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <div>
            <h4 className="text-green-800 font-semibold text-sm">Avaliação enviada!</h4>
            <p className="text-green-700 text-xs">Obrigado pelo feedback sobre o cliente.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
        <label className="block text-sm font-semibold text-gray-800 mb-3">
          Como foi sua experiência com este cliente?
        </label>
        <div className="flex flex-col items-center gap-2">
          <StarRating rating={rating} onRatingChange={setRating} />
          <p className={`text-base font-semibold ${getRatingColor(rating)}`}>{getRatingText(rating)}</p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          <MessageSquare className="inline h-3 w-3 mr-1" />
          Comentário (opcional):
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Descreva sua experiência com o cliente..."
          rows={3}
          maxLength={200}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition-colors resize-none text-sm"
        />
        <div className="text-right">
          <span className="text-xs text-gray-500">{comment.length}/200</span>
        </div>
      </div>

      {submitError && <p className="text-red-500 text-sm">{submitError}</p>}

      <button
        type="submit"
        disabled={loading}
        className={`w-full min-h-[48px] flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm transition-all ${
          loading
            ? "bg-gray-400 cursor-not-allowed text-white"
            : "bg-orange-500 hover:bg-orange-600 text-white shadow-md"
        }`}
      >
        {loading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            Enviando...
          </>
        ) : (
          <>
            <Send className="h-4 w-4" />
            Enviar Avaliação
          </>
        )}
      </button>
    </form>
  );
}
