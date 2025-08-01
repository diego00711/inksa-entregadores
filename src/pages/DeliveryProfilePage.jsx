// Ficheiro: src/pages/DeliveryProfilePage.jsx (VERSÃO FINAL E CORRETA)

import React, { useState, useEffect } from 'react';
// ✅ 1. IMPORTAÇÃO CORRIGIDA
import { useProfile } from '../context/DeliveryProfileContext.jsx'; 
import DeliveryService from '../services/deliveryService.js'; // Importamos para o upload de avatar
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card.jsx';
import { useToast } from '../context/ToastContext.jsx'; // Usar o toast para feedback

export default function DeliveryProfilePage() {
  // ✅ 2. USO CORRETO DO HOOK E DAS FUNÇÕES DO CONTEXTO
  const { profile, loading, updateProfile } = useProfile(); 
  
  const [formData, setFormData] = useState({});
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const addToast = useToast();

  useEffect(() => {
    if (profile) {
      setFormData(profile);
    }
  }, [profile]);

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      // ✅ 3. LÓGICA CORRETA
      // A função updateProfile vem do contexto e já sabe o que fazer.
      await updateProfile(formData); 
      addToast('Perfil atualizado com sucesso!', 'success');
      setIsEditing(false);
    } catch (error) {
      addToast(`Erro ao atualizar: ${error.message}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-center">A carregar perfil...</div>;
  }

  // O seu código JSX está ótimo e foi mantido.
  return (
    <div className="page-container p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Meu Perfil</h1>
          <p className="text-gray-500">Veja e edite suas informações pessoais e bancárias.</p>
        </div>
        {!isEditing && (
          <Button onClick={() => setIsEditing(true)}>Editar Perfil</Button>
        )}
      </div>

      <form onSubmit={handleSave}>
        <Card>
          <CardHeader>
            <CardTitle>Informações Pessoais</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <Label htmlFor="name">Nome</Label>
              <Input id="name" value={formData.name || ''} onChange={handleChange} disabled={!isEditing} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={formData.email || ''} disabled />
            </div>
            <div className="space-y-1">
              <Label htmlFor="phone">Telefone</Label>
              <Input id="phone" value={formData.phone || ''} onChange={handleChange} disabled={!isEditing} />
            </div>
          </CardContent>
        </Card>

        {isEditing && (
          <div className="flex justify-end gap-4 mt-6">
            <Button variant="outline" onClick={() => setIsEditing(false)}>Cancelar</Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'A Guardar...' : 'Guardar Alterações'}
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}