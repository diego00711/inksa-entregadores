// Componente otimizado para entregadores avaliarem clientes
import React, { useState } from "react";
import { Star, Send, CheckCircle, MessageSquare, Clock, MapPin, Phone } from "lucide-react";

// Componente para rating rápido com estrelas
const QuickStarRating = ({ rating, onRatingChange, size = "w-6 h-6" }) => {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onRatingChange(star)}
          className={`${size} transition-all duration-200 hover:scale-110 ${
            star <= rating
              ? "text-yellow-400 fill-yellow-400"
              : "text-gray-300 hover:text-yellow-300"
          }`}
        >
          <Star className="w-full h-full" />
        </button>
      ))}
      <span className="ml-2 text-sm font-medium text-gray-600">
        ({rating}/5)
      </span>
    </div>
  );
};

// Botões de avaliação rápida para clientes
const QuickClientTags = ({ selectedTags, onTagToggle }) => {
  const tags = [
    { id: "educado", label: "Educado", emoji: "😊", color: "bg-green-100 text-green-700 border-green-300" },
    { id: "pontual", label: "Pontual", emoji: "⏰", color: "bg-blue-100 text-blue-700 border-blue-300" },
    { id: "comunicativo", label: "Comunicativo", emoji: "📱", color: "bg-purple-100 text-purple-700 border-purple-300" },
    { id: "endereco-claro", label: "Endereço claro", emoji: "📍", color: "bg-emerald-100 text-emerald-700 border-emerald-300" },
    { id: "gorjeta", label: "Deu gorjeta", emoji: "💰", color: "bg-yellow-100 text-yellow-700 border-yellow-300" },
    { id: "indisponivel", label: "Indisponível", emoji: "❌", color: "bg-red-100 text-red-700 border-red-300" },
    { id: "endereco-errado", label: "Endereço errado", emoji: "⚠️", color: "bg-orange-100 text-orange-700 border-orange-300" },
    { id: "nao-atendeu", label: "Não atendeu", emoji: "📵", color: "bg-gray-100 text-gray-700 border-gray-300" },
  ];

  return (
    <div>
      <p className="text-sm font-medium text-gray-700 mb-2">
        Como foi o cliente? (toque para marcar):
      </p>
      <div className="grid grid-cols-2 gap-2">
        {tags.map((tag) => (
          <button
            key={tag.id}
            type="button"
            onClick={() => onTagToggle(tag.id)}
            className={`px-3 py-2 rounded-lg text-sm font-medium border-2 transition-all duration-200 ${
              selectedTags.includes(tag.id)
                ? tag.color
                : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
            }`}
          >
            <span className="mr-1">{tag.emoji}</span>
            {tag.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default function ClientReviewForm({ clientId, orderId, onSuccess }) {
  const [rating, setRating] = useState(5);
  const [selectedTags, setSelectedTags] = useState([]);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleTagToggle = (tagId) => {
    setSelectedTags(prev => 
      prev.includes(tagId) 
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  const handleQuickRating = (quickRating, tags) => {
    setRating(quickRating);
    setSelectedTags(tags);
    handleSubmit(null, quickRating, tags);
  };

  const handleSubmit = async (e, quickRating = null, quickTags = null) => {
    if (e) e.preventDefault();
    
    setLoading(true);
    
    try {
      // Simulating API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log({
        clientId,
        orderId,
        rating: quickRating || rating,
        tags: quickTags || selectedTags,
        comment: comment.trim(),
      });
      
      setSuccess(true);
      
      setTimeout(() => {
        onSuccess?.();
      }, 1500);
      
    } catch (error) {
      console.error("Erro ao enviar avaliação:", error);
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
    <div className="space-y-4">
      {/* Quick Action Buttons - Mobile First */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <button
          type="button"
          onClick={() => handleQuickRating(5, ["educado", "pontual"])}
          disabled={loading}
          className="bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-4 rounded-lg text-sm transition-colors disabled:opacity-50"
        >
          👍 Cliente Top (5⭐)
        </button>
        <button
          type="button"
          onClick={() => handleQuickRating(3, [])}
          disabled={loading}
          className="bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-3 px-4 rounded-lg text-sm transition-colors disabled:opacity-50"
        >
          😐 Normal (3⭐)
        </button>
      </div>

      {/* Detailed Form */}
      <details className="bg-gray-50 rounded-lg border border-gray-200">
        <summary className="cursor-pointer p-3 font-medium text-gray-700 text-sm hover:bg-gray-100 transition-colors">
          ⚙️ Avaliação detalhada (opcional)
        </summary>
        
        <form onSubmit={handleSubmit} className="p-4 pt-0 space-y-4">
          {/* Star Rating */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Nota geral:
            </label>
            <QuickStarRating 
              rating={rating} 
              onRatingChange={setRating}
            />
          </div>

          {/* Quick Tags */}
          <QuickClientTags 
            selectedTags={selectedTags}
            onTagToggle={handleTagToggle}
          />

          {/* Comment - Optional */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <MessageSquare className="inline h-3 w-3 mr-1" />
              Observações (opcional):
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Ex: Cliente muito educado, deu gorjeta..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none text-sm"
              maxLength={200}
            />
            <div className="text-right">
              <span className="text-xs text-gray-500">
                {comment.length}/200
              </span>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-semibold text-sm transition-all duration-200 ${
              loading
                ? "bg-gray-400 cursor-not-allowed text-white"
                : "bg-blue-500 hover:bg-blue-600 text-white shadow-md hover:shadow-lg"
            }`}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
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
      </details>

      {/* Tips for deliveryman */}
      <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
        <p className="text-blue-800 font-medium text-xs mb-1">💡 Dica rápida:</p>
        <p className="text-blue-700 text-xs">
          Use os botões rápidos para avaliar rapidamente entre entregas. A avaliação detalhada é opcional.
        </p>
      </div>
    </div>
  );
}
