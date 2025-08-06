// Ficheiro: src/pages/DeliveryProfilePage.jsx (VERSÃO TURBINADA E CORRIGIDA)

import React, { useState, useEffect, useCallback } from 'react';
import DeliveryService from '../services/deliveryService';
import { useProfile } from '../context/DeliveryProfileContext';
import { useToast } from '../context/ToastContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, parseISO } from 'date-fns';
import { CameraIcon } from 'lucide-react'; // Importa um ícone para a câmera/foto

export default function DeliveryProfilePage() {
    const { profile: contextProfile, updateProfile: updateContextProfile, loading: profileLoading } = useProfile();
    const addToast = useToast();

    // Estado para os dados do formulário
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        cpf: '',
        birth_date: '',
        vehicle_type: '',
        is_available: false,
        address_street: '',
        address_number: '',
        address_complement: '',
        address_neighborhood: '',
        address_city: '',
        address_state: '',
        address_zipcode: '',
        latitude: '',
        longitude: '',
        bank_name: '',
        bank_agency: '',
        bank_account_number: '',
        bank_account_type: '',
        pix_key: '',
        payout_frequency: 'weekly',
        mp_account_id: '',
        avatar_url: '' // Adiciona avatar_url ao formData
    });

    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // ✅ NOVO: Estados para a gestão da imagem do perfil
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);

    // Carregar dados do perfil e inicializar a previewUrl
    useEffect(() => {
        if (!profileLoading && contextProfile) {
            setFormData({
                first_name: contextProfile.first_name || '',
                last_name: contextProfile.last_name || '',
                email: contextProfile.email || '',
                phone: contextProfile.phone || '',
                cpf: contextProfile.cpf || '',
                birth_date: contextProfile.birth_date ? format(parseISO(contextProfile.birth_date), 'yyyy-MM-dd') : '',
                vehicle_type: contextProfile.vehicle_type || '',
                is_available: contextProfile.is_available ?? false,
                address_street: contextProfile.address_street || '',
                address_number: contextProfile.address_number || '',
                address_complement: contextProfile.address_complement || '',
                address_neighborhood: contextProfile.address_neighborhood || '',
                address_city: contextProfile.address_city || '',
                address_state: contextProfile.address_state || '',
                address_zipcode: contextProfile.address_zipcode || '',
                latitude: contextProfile.latitude || '',
                longitude: contextProfile.longitude || '',
                bank_name: contextProfile.bank_name || '',
                bank_agency: contextProfile.bank_agency || '',
                bank_account_number: contextProfile.bank_account_number || '',
                bank_account_type: contextProfile.bank_account_type || '',
                pix_key: contextProfile.pix_key || '',
                payout_frequency: contextProfile.payout_frequency || 'weekly',
                mp_account_id: contextProfile.mp_account_id || '',
                avatar_url: contextProfile.avatar_url || '' // Inicializa com a URL existente
            });
            setPreviewUrl(contextProfile.avatar_url || null); // Define a URL de preview inicial
            setLoading(false);
        } else if (!profileLoading && !contextProfile) {
            addToast("Perfil não encontrado. Faça login.", "error");
            setLoading(false);
        }
    }, [profileLoading, contextProfile, addToast]);

    const handleChange = useCallback((e) => {
        const { id, value } = e.target;
        setFormData(prev => ({ ...prev, [id]: value }));
    }, []);

    const handleSelectChange = useCallback((id, value) => {
        setFormData(prev => ({ ...prev, [id]: value }));
    }, []);

    // ✅ NOVO: Função para manipular a seleção de arquivo de imagem
    const handleFileChange = (event) => {
        if (event.target.files && event.target.files.length > 0) {
            const file = event.target.files[0];
            setSelectedFile(file); // Armazena o arquivo
            setPreviewUrl(URL.createObjectURL(file)); // Cria URL para preview imediato
        } else {
            setSelectedFile(null);
            setPreviewUrl(formData.avatar_url || null); // Volta para a URL original ou nulo
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        addToast("Salvando perfil...", "info");

        try {
            const dataToSubmit = { ...formData };
            if (dataToSubmit.birth_date) {
                dataToSubmit.birth_date = new Date(dataToSubmit.birth_date).toISOString().split('T')[0];
            }
            delete dataToSubmit.email;
            delete dataToSubmit.is_available;
            delete dataToSubmit.avatar_url; // Remove avatar_url, pois será enviado via upload separado

            let updatedProfile = null;

            // ✅ Lógica para enviar o arquivo de imagem SE um novo arquivo foi selecionado
            if (selectedFile) {
                try {
                    const avatarUrl = await DeliveryService.uploadDeliveryAvatar(selectedFile);
                    // Atualiza o formData com a nova URL do avatar antes de enviar outros dados do perfil
                    dataToSubmit.avatar_url = avatarUrl; // O backend vai atualizar este campo
                    updatedProfile = await DeliveryService.updateDeliveryProfile(dataToSubmit);
                } catch (uploadError) {
                    addToast("Erro ao fazer upload da imagem. Tentando salvar o restante do perfil.", "warning");
                    console.error("Erro no upload da imagem:", uploadError);
                    // Continua para salvar o resto do perfil mesmo se o upload falhar
                    updatedProfile = await DeliveryService.updateDeliveryProfile(dataToSubmit); 
                }
            } else {
                // Se nenhum arquivo novo foi selecionado, apenas atualiza o perfil normal
                updatedProfile = await DeliveryService.updateDeliveryProfile(dataToSubmit);
            }
            
            updateContextProfile(updatedProfile); // Atualiza o contexto global
            addToast("Perfil atualizado com sucesso!", "success");
            setIsEditing(false);
            setSelectedFile(null); // Limpa o arquivo selecionado após o upload/salvamento
        } catch (error) {
            addToast(error.message || "Erro ao salvar perfil.", "error");
            console.error("Erro ao salvar perfil:", error);
        } finally {
            setIsSaving(false);
        }
    };

    if (profileLoading || loading) {
        return <div className="page-container text-center py-10">A carregar perfil...</div>;
    }

    return (
        <div className="profile-container p-6 bg-gray-50 min-h-screen">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Meu Perfil</h1>
                {!isEditing ? (
                    <Button onClick={() => setIsEditing(true)} className="bg-orange-500 hover:bg-orange-600 text-white">
                        Editar Perfil
                    </Button>
                ) : (
                    <div className="flex gap-2">
                        <Button onClick={() => setIsEditing(false)} variant="outline">Cancelar</Button>
                        <Button type="submit" disabled={isSaving} className="bg-green-500 hover:bg-green-600 text-white">
                            {isSaving ? "Salvando..." : "Salvar Alterações"}
                        </Button>
                    </div>
                )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Informações Pessoais */}
                <Card className="shadow-lg">
                    <CardHeader><CardTitle className="text-xl font-semibold">Informações Pessoais</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* ✅ NOVO: Campo para Foto de Perfil */}
                        <div className="flex flex-col items-center col-span-full md:col-span-1">
                            <Label htmlFor="avatar_upload" className="cursor-pointer mb-2 font-medium text-gray-700">Foto de Perfil</Label>
                            <div className="relative w-36 h-36 rounded-full overflow-hidden border-2 border-gray-200 flex items-center justify-center bg-gray-100">
                                {previewUrl ? (
                                    <img src={previewUrl} alt="Foto de Perfil" className="w-full h-full object-cover" />
                                ) : (
                                    <CameraIcon className="h-16 w-16 text-gray-400" /> // Ícone de câmera se não houver foto
                                )}
                                {isEditing && (
                                    <label htmlFor="avatar_upload" className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center text-white text-sm cursor-pointer hover:bg-opacity-60 transition-opacity">
                                        <CameraIcon className="h-8 w-8" />
                                        <input
                                            type="file"
                                            id="avatar_upload"
                                            accept="image/*"
                                            onChange={handleFileChange}
                                            className="hidden"
                                        />
                                    </label>
                                )}
                            </div>
                            {!isEditing && !previewUrl && (
                                <p className="text-sm text-gray-500 mt-2">Nenhuma foto de perfil.</p>
                            )}
                            {!isEditing && previewUrl && (
                                <p className="text-sm text-gray-500 mt-2">Clique em "Editar Perfil" para alterar.</p>
                            )}
                        </div>

                        {/* Campos de texto existentes, pode ajustar o grid para melhor layout */}
                        <div>
                            <Label htmlFor="first_name">Nome</Label>
                            <Input id="first_name" value={formData.first_name} onChange={handleChange} disabled={!isEditing} />
                        </div>
                        <div>
                            <Label htmlFor="last_name">Sobrenome</Label>
                            <Input id="last_name" value={formData.last_name} onChange={handleChange} disabled={!isEditing} />
                        </div>
                        <div>
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" value={formData.email} disabled />
                        </div>
                        <div>
                            <Label htmlFor="phone">Telefone</Label>
                            <Input id="phone" value={formData.phone} onChange={handleChange} disabled={!isEditing} />
                        </div>
                        <div>
                            <Label htmlFor="cpf">CPF</Label>
                            <Input id="cpf" value={formData.cpf} onChange={handleChange} disabled={!isEditing} />
                        </div>
                        <div>
                            <Label htmlFor="birth_date">Data de Nascimento</Label>
                            <Input id="birth_date" type="date" value={formData.birth_date} onChange={handleChange} disabled={!isEditing} />
                        </div>
                    </CardContent>
                </Card>

                {/* Endereço */}
                <Card className="shadow-lg">
                    <CardHeader><CardTitle className="text-xl font-semibold">Endereço</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                            <Label htmlFor="address_street">Rua</Label>
                            <Input id="address_street" value={formData.address_street} onChange={handleChange} disabled={!isEditing} />
                        </div>
                        <div>
                            <Label htmlFor="address_number">Número</Label>
                            <Input id="address_number" value={formData.address_number} onChange={handleChange} disabled={!isEditing} />
                        </div>
                        <div>
                            <Label htmlFor="address_complement">Complemento</Label>
                            <Input id="address_complement" value={formData.address_complement} onChange={handleChange} disabled={!isEditing} />
                        </div>
                        <div>
                            <Label htmlFor="address_neighborhood">Bairro</Label>
                            <Input id="address_neighborhood" value={formData.address_neighborhood} onChange={handleChange} disabled={!isEditing} />
                        </div>
                        <div>
                            <Label htmlFor="address_city">Cidade</Label>
                            <Input id="address_city" value={formData.address_city} onChange={handleChange} disabled={!isEditing} />
                        </div>
                        <div>
                            <Label htmlFor="address_state">Estado</Label>
                            <Input id="address_state" value={formData.address_state} onChange={handleChange} disabled={!isEditing} />
                        </div>
                        <div>
                            <Label htmlFor="address_zipcode">CEP</Label>
                            <Input id="address_zipcode" value={formData.address_zipcode} onChange={handleChange} disabled={!isEditing} />
                        </div>
                        <div>
                            <Label htmlFor="latitude">Latitude</Label>
                            <Input id="latitude" value={formData.latitude} disabled />
                        </div>
                        <div>
                            <Label htmlFor="longitude">Longitude</Label>
                            <Input id="longitude" value={formData.longitude} disabled />
                        </div>
                    </CardContent>
                </Card>

                {/* Informações do Veículo */}
                <Card className="shadow-lg">
                    <CardHeader><CardTitle className="text-xl font-semibold">Informações do Veículo</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="vehicle_type">Tipo de Veículo</Label>
                            <Select id="vehicle_type" value={formData.vehicle_type} onValueChange={(value) => handleSelectChange('vehicle_type', value)} disabled={!isEditing}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione o tipo de veículo" />
                                </SelectTrigger>
                                <SelectContent className="bg-white"> {/* ✅ CORRIGIDO: Fundo branco */}
                                    <SelectItem value="moto">Moto</SelectItem>
                                    <SelectItem value="carro">Carro</SelectItem>
                                    <SelectItem value="bicicleta">Bicicleta</SelectItem>
                                    <SelectItem value="outro">Outro</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                {/* Informações Bancárias */}
                <Card className="shadow-lg">
                    <CardHeader><CardTitle className="text-xl font-semibold">Informações Bancárias</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="bank_name">Nome do Banco</Label>
                            <Input id="bank_name" value={formData.bank_name} onChange={handleChange} disabled={!isEditing} />
                        </div>
                        <div>
                            <Label htmlFor="bank_agency">Agência</Label>
                            <Input id="bank_agency" value={formData.bank_agency} onChange={handleChange} disabled={!isEditing} />
                        </div>
                        <div>
                            <Label htmlFor="bank_account_number">Número da Conta</Label>
                            <Input id="bank_account_number" value={formData.bank_account_number} onChange={handleChange} disabled={!isEditing} />
                        </div>
                        <div>
                            <Label htmlFor="bank_account_type">Tipo de Conta</Label>
                            <Select id="bank_account_type" value={formData.bank_account_type} onValueChange={(value) => handleSelectChange('bank_account_type', value)} disabled={!isEditing}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione o tipo de conta" />
                                </SelectTrigger>
                                <SelectContent className="bg-white"> {/* ✅ CORRIGIDO: Fundo branco */}
                                    <SelectItem value="corrente">Corrente</SelectItem>
                                    <SelectItem value="poupanca">Poupança</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="pix_key">Chave Pix</Label>
                            <Input id="pix_key" value={formData.pix_key} onChange={handleChange} disabled={!isEditing} />
                        </div>
                        <div>
                            <Label htmlFor="payout_frequency">Frequência de Recebimento</Label>
                            <Select id="payout_frequency" value={formData.payout_frequency} onValueChange={(value) => handleSelectChange('payout_frequency', value)} disabled={!isEditing}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione a frequência" />
                                </SelectTrigger>
                                <SelectContent className="bg-white"> {/* ✅ CORRIGIDO: Fundo branco */}
                                    <SelectItem value="weekly">Semanal</SelectItem>
                                    <SelectItem value="biweekly">Quinzenal</SelectItem>
                                    <SelectItem value="monthly">Mensal</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                {isEditing && (
                    <div className="flex justify-end gap-2">
                         <Button onClick={() => setIsEditing(false)} variant="outline">Cancelar</Button>
                        <Button type="submit" disabled={isSaving} className="bg-green-500 hover:bg-green-600 text-white">
                            {isSaving ? "Salvando..." : "Salvar Alterações"}
                        </Button>
                    </div>
                )}
            </form>
        </div>
    );
}