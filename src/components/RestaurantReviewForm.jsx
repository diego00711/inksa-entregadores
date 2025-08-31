import React, { useState } from "react";
import { Star, Send, CheckCircle, MessageSquare, Clock, Utensils, Users, Package } from "lucide-react";

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

// Botões de avaliação rápida para restaurantes
const QuickRestaurantTags = ({ selectedTags, onTagToggle }) => {
  const tags = [
    { id: "rapido", label: "Pedido rápido", emoji: "⚡", color: "bg-green-100 text-green-700 border-green-300" },
    { id: "organizados", label: "Bem organizados", emoji: "📋", color: "bg-blue-100 text-blue-700 border-blue-300" },
    { id: "educados", label: "Staff educado", emoji: "😊", color: "bg-purple-100 text-purple-700 border-purple-300" },
    { id: "local-limpo", label: "Local limpo", emoji: "✨", color: "bg-emerald-100 text-emerald-700 border-emerald-300" },
    { id: "embalagem-boa", label: "Boa embalagem", emoji: "📦", color: "bg-yellow-100 text-yellow-700 border-yellow-300" },
    { id: "demorado", label: "Muito demorado", emoji: "⏰", color: "bg-red-100 text-red-700 border-red-300" },
    { id: "desorganizado", label: "Desorganizado", emoji: "❌", color: "bg-orange-100 text-orange-700 border-orange-300" },
    { id: "mal-educado", label: "Staff mal educado", emoji: "😤", color: "bg-red-100 text-red-700 border-red-300" },
  ];

  return (
    <div>
      <p className="text-sm font-medium text-gray-700 mb-2">
        Como foi no restaurante? (toque para marcar):
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

// Avaliação por categoria específica para entregadores
const DeliverymanCategoryRating = ({ categories, onCategoryChange }) => {
  const categoryList = [
    { id: "tempo_preparo", label: "Tempo de preparo", icon: <Clock className="h-4 w-4" /> },
    { id: "atendimento", label: "Atendimento", icon: <Users className="h-4 w-4" /> },
    { id: "organizacao", label: "Organização", icon: <Package className="h-4 w-4" /> },
    { id: "embalagem", label: "Embalagem", icon: <Utensils className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-gray-700">Avalie por categoria:</p>
      {categoryList.map((category) => (
        <div key={category.id} className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-gray-500">{category.icon}</span>
            <span className="text-sm text-gray-700">{category.label}</span>
          </div>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => onCategoryChange(category.id, star)}
                className={`w-4 h-4 transition-all duration-200 ${
                  star <= (categories[category.id] || 0)
                    ? "text-yellow-400 fill-yellow-400"
                    : "text-gray-300 hover:text-yellow-300"
                }`}
              >
                <Star className="w-full h-full" />
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default function RestaurantReviewForm({ restaurantId, orderId, onSuccess }) {
  const [rating, setRating] = useState(5);
  const [selectedTags, setSelectedTags] = useState([]);
  const [categories, setCategories] = useState({});
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

  const handleCategoryChange = (categoryId, rating) => {
    setCategories(prev => ({
      ...prev,
      [categoryId]: rating
    }));
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
        restaurantId,
        orderId,
        rating: quickRating || rating,
        tags: quickTags || selectedTags,
        categories,
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
            <p className="text-green-700 text-xs">Obrigado pelo feedback sobre o restaurante.</p>
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
          onClick={() => handleQuickRating(5, ["rapido", "organizados", "educados"])}
          disabled={loading}
          className="bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-4 rounded-lg text-sm transition-colors disabled:opacity-50"
        >
          👍 Restaurante Top (5⭐)
        </button>
        <button
          type="button"
          onClick={() => handleQuickRating(2, ["demorado"])}
          disabled={loading}
          className="bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-4 rounded-lg text-sm transition-colors disabled:opacity-50"
        >
          👎 Muito demorado (2⭐)
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
              <Utensils className="inline h-3 w-3 mr-1" />
              Nota geral:
            </label>
            <QuickStarRating 
              rating={rating} 
              onRatingChange={setRating}
            />
          </div>

          {/* Category Ratings */}
          <div className="bg-white rounded-lg p-3 border border-gray-200">
            <DeliverymanCategoryRating 
              categories={categories}
              onCategoryChange={handleCategoryChange}
            />
          </div>

          {/* Quick Tags */}
          <QuickRestaurantTags 
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
              placeholder="Ex: Pedido ficou pronto em 5min, staff muito educado..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors resize-none text-sm"
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
                : "bg-red-500 hover:bg-red-600 text-white shadow-md hover:shadow-lg"
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

      {/* Delivery Time Feedback */}
      <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
        <div className="flex items-start gap-2">
          <Clock className="h-4 w-4 text-orange-600 mt-0.5" />
          <div>
            <p className="text-orange-800 font-medium text-xs mb-1">⏱️ Tempo de preparo:</p>
            <div className="grid grid-cols-3 gap-1">
              <button 
                type="button"
                onClick={() => {
                  setSelectedTags(prev => [...prev.filter(t => t !== 'rapido' && t !== 'demorado'), 'rapido']);
                  setRating(5);
                }}
                className="bg-green-100 hover:bg-green-200 text-green-700 px-2 py-1 rounded text-xs transition-colors"
              >
                &lt; 10min 🚀
              </button>
              <button 
                type="button"
                onClick={() => setRating(4)}
                className="bg-yellow-100 hover:bg-yellow-200 text-yellow-700 px-2 py-1 rounded text-xs transition-colors"
              >
                10-20min ⏰
              </button>
              <button 
                type="button"
                onClick={() => {
                  setSelectedTags(prev => [...prev.filter(t => t !== 'rapido' && t !== 'demorado'), 'demorado']);
                  setRating(2);
                }}
                className="bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded text-xs transition-colors"
              >
                &gt; 20min 😓
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tips for deliveryman */}
      <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
        <p className="text-blue-800 font-medium text-xs mb-1">💡 Dica:</p>
        <p className="text-blue-700 text-xs">
          Sua avaliação ajuda outros entregadores a saberem o que esperar deste restaurante. Seja honesto sobre o tempo de preparo!
        </p>
      </div>
    </div>
  );
}
