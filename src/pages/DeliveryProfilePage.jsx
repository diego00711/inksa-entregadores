// Ficheiro: src/pages/DeliveryProfilePage.jsx (VERSÃO CORRIGIDA - TODOS OS BUGS)

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
import { CameraIcon, MapPin } from 'lucide-react';

export default function DeliveryProfilePage() {
    const { profile: contextProfile, updateProfile: updateContextProfile, loading: profileLoading } = useProfile();
    const addToast = useToast();

    // Estado para os dados do formulário
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        phone: '',
        cpf: '',
        birth_date: '',
        vehicle_type: '',
        address_street: '',
        address_number: '',
        address_complement: '',
        address_neighborhood: '',
        address_city: '',
        address_state: '',
        address_zipcode: '',
        bank_name: '',
        bank_agency: '',
        bank_account_number: '',
        bank_account_type: '',
        pix_key: '',
        payout_frequency: 'weekly',
        avatar_url: ''
    });

    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Estados para a gestão da imagem do perfil
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);

    // Carregar dados do perfil
    useEffect(() => {
        if (!profileLoading && contextProfile) {
            setFormData({
                first_name: contextProfile.first_name || '',
                last_name: contextProfile.last_name || '',
                phone: contextProfile.phone || '',
                cpf: contextProfile.cpf || '',
                birth_date: contextProfile.birth_date ? format(parseISO(contextProfile.birth_date), 'yyyy-MM-dd') : '',
                vehicle_type: contextProfile.vehicle_type || '',
                address_street: contextProfile.address_street || '',
                address_number: contextProfile.address_number || '',
                address_complement: contextProfile.address_complement || '',
                address_neighborhood: contextProfile.address_neighborhood || '',
                address_city: contextProfile.address_city || '',
                address_state: contextProfile.address_state || '',
                address_zipcode: contextProfile.address_zipcode || '',
                bank_name: contextProfile.bank_name || '',
                bank_agency: contextProfile.bank_agency || '',
                bank_account_number: contextProfile.bank_account_number || '',
                bank_account_type: contextProfile.bank_account_type || '',
                pix_key: contextProfile.pix_key || '',
                payout_frequency: contextProfile.payout_frequency || 'weekly',
                avatar_url: contextProfile.avatar_url || ''
            });
            setPreviewUrl(contextProfile.avatar_url || null);
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

    // Função para manipular a seleção de arquivo de imagem
    const handleFileChange = (event) => {
        if (event.target.files && event.target.files.length > 0) {
            const file = event.target.files[0];
            setSelectedFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        } else {
            setSelectedFile(null);
            setPreviewUrl(formData.avatar_url || null);
        }
    };

    // ✅ CORREÇÃO: Função de submit que funciona com botão do header
    const handleSave = async () => {
        setIsSaving(true);
        addToast("Salvando perfil...", "info");

        try {
            const dataToSubmit = { ...formData };
            if (dataToSubmit.birth_date) {
                dataToSubmit.birth_date = new Date(dataToSubmit.birth_date).toISOString().split('T')[0];
            }
            
            // Remove campos que não devem ser enviados
            delete dataToSubmit.avatar_url;

            let updatedProfile = null;

            // Upload de imagem se selecionada
            if (selectedFile) {
                try {
                    const avatarUrl = await DeliveryService.uploadDeliveryAvatar(selectedFile);
                    addToast("Foto de perfil atualizada!", "success");
                } catch (uploadError) {
                    addToast("Erro ao fazer upload da imagem.", "warning");
                    console.error("Erro no upload da imagem:", uploadError);
                }
            }

            // Salvar perfil
            updatedProfile = await DeliveryService.updateDeliveryProfile(dataToSubmit);
            updateContextProfile(updatedProfile);
            addToast("Perfil atualizado com sucesso!", "success");
            setIsEditing(false);
            setSelectedFile(null);
        } catch (error) {
            addToast(error.message || "Erro ao salvar perfil.", "error");
            console.error("Erro ao salvar perfil:", error);
        } finally {
            setIsSaving(false);
        }
    };

    // ✅ CORREÇÃO: Função de submit do form
    const handleSubmit = async (e) => {
        e.preventDefault();
        await handleSave();
    };

    // ✅ CORREÇÃO: Função para buscar coordenadas automaticamente
    const handleGeocodeAddress = async () => {
        const { address_street, address_number, address_city, address_state } = formData;
        
        if (!address_street || !address_city) {
            addToast("Preencha pelo menos a rua e cidade para buscar coordenadas", "warning");
            return;
        }

        const fullAddress = `${address_street}, ${address_number}, ${address_city}, ${address_state}`;
        
        try {
            addToast("Buscando coordenadas...", "info");
            
            // Usando API gratuita do OpenStreetMap Nominatim
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullAddress)}&limit=1`
            );
            
            const data = await response.json();
            
            if (data && data.length > 0) {
                const { lat, lon } = data[0];
                
                // Atualizar latitude e longitude automaticamente
                setFormData(prev => ({
                    ...prev,
                    latitude: lat,
                    longitude: lon
                }));
                
                addToast("Coordenadas encontradas automaticamente!", "success");
            } else {
                addToast("Não foi possível encontrar as coordenadas do endereço", "warning");
            }
        } catch (error) {
            console.error("Erro ao buscar coordenadas:", error);
            addToast("Erro ao buscar coordenadas do endereço", "error");
        }
    };

    if (profileLoading || loading) {
        return <div className="page-container text-center py-10">Carregando perfil...</div>;
    }

    return (
        <div className="profile-container p-6 bg-gray-50 min-h-screen">
            {/* ✅ CORREÇÃO: Header com botão funcional */}
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Meu Perfil</h1>
                {!isEditing ? (
                    <Button onClick={() => setIsEditing(true)} className="bg-orange-500 hover:bg-orange-600 text-white">
                        Editar Perfil
                    </Button>
                ) : (
                    <div className="flex gap-2">
                        <Button 
                            onClick={() => {
                                setIsEditing(false);
                                setSelectedFile(null);
                                setPreviewUrl(formData.avatar_url || null);
                            }} 
                            variant="outline"
                        >
                            Cancelar
                        </Button>
                        <Button 
                            onClick={handleSave} 
                            disabled={isSaving} 
                            className="bg-green-500 hover:bg-green-600 text-white"
                        >
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
                        {/* Campo para Foto de Perfil */}
                        <div className="flex flex-col items-center col-span-full md:col-span-1">
                            <Label htmlFor="avatar_upload" className="cursor-pointer mb-2 font-medium text-gray-700">Foto de Perfil</Label>
                            <div className="relative w-36 h-36 rounded-full overflow-hidden border-2 border-gray-200 flex items-center justify-center bg-gray-100">
                                {previewUrl ? (
                                    <img src={previewUrl} alt="Foto de Perfil" className="w-full h-full object-cover" />
                                ) : (
                                    <CameraIcon className="h-16 w-16 text-gray-400" />
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
                            {isEditing && (
                                <p className="text-sm text-gray-500 mt-2">Clique na foto para alterar</p>
                            )}
                        </div>

                        <div>
                            <Label htmlFor="first_name">Nome</Label>
                            <Input id="first_name" value={formData.first_name} onChange={handleChange} disabled={!isEditing} />
                        </div>
                        <div>
                            <Label htmlFor="last_name">Sobrenome</Label>
                            <Input id="last_name" value={formData.last_name} onChange={handleChange} disabled={!isEditing} />
                        </div>
                        <div>
                            <Label htmlFor="phone">Telefone</Label>
                            <Input id="phone" value={formData.phone} onChange={handleChange} disabled={!isEditing} />
                        </div>
                        <div>
                            <Label htmlFor="cpf">CPF</Label>
                            <Input id="cpf" value={formData.cpf} onChange={handleChange} disabled={!isEditing} />
                        </div>
                        <div className="col-span-full md:col-span-1">
                            <Label htmlFor="birth_date">Data de Nascimento</Label>
                            <Input id="birth_date" type="date" value={formData.birth_date} onChange={handleChange} disabled={!isEditing} />
                        </div>
                    </CardContent>
                </Card>

                {/* ✅ CORREÇÃO: Endereço com busca automática de coordenadas */}
                <Card className="shadow-lg">
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <CardTitle className="text-xl font-semibold">Endereço</CardTitle>
                            {isEditing && (
                                <Button 
                                    type="button" 
                                    onClick={handleGeocodeAddress}
                                    variant="outline" 
                                    size="sm"
                                    className="flex items-center gap-2"
                                >
                                    <MapPin className="w-4 h-4" />
                                    Buscar Coordenadas
                                </Button>
                            )}
                        </div>
                    </CardHeader>
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
                        <div className="col-span-full md:col-span-1">
                            <Label htmlFor="address_zipcode">CEP</Label>
                            <Input id="address_zipcode" value={formData.address_zipcode} onChange={handleChange} disabled={!isEditing} />
                        </div>
                        
                        {/* ✅ CORREÇÃO: Coordenadas ocultas mas mostradas como informação */}
                        {(formData.latitude || formData.longitude) && (
                            <div className="col-span-full">
                                <div className="bg-gray-100 p-3 rounded-lg">
                                    <p className="text-sm font-medium text-gray-700 mb-1">Coordenadas (preenchido automaticamente)</p>
                                    <p className="text-xs text-gray-600">
                                        Lat: {formData.latitude || 'Não definido'} | 
                                        Lng: {formData.longitude || 'Não definido'}
                                    </p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Informações do Veículo */}
                <Card className="shadow-lg">
                    <CardHeader><CardTitle className="text-xl font-semibold">Informações do Veículo</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="vehicle_type">Tipo de Veículo</Label>
                            <Select value={formData.vehicle_type} onValueChange={(value) => handleSelectChange('vehicle_type', value)} disabled={!isEditing}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione o tipo de veículo" />
                                </SelectTrigger>
                                <SelectContent className="bg-white">
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
                            <Select value={formData.bank_account_type} onValueChange={(value) => handleSelectChange('bank_account_type', value)} disabled={!isEditing}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione o tipo de conta" />
                                </SelectTrigger>
                                <SelectContent className="bg-white">
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
                            <Select value={formData.payout_frequency} onValueChange={(value) => handleSelectChange('payout_frequency', value)} disabled={!isEditing}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione a frequência" />
                                </SelectTrigger>
                                <SelectContent className="bg-white">
                                    <SelectItem value="weekly">Semanal</SelectItem>
                                    <SelectItem value="biweekly">Quinzenal</SelectItem>
                                    <SelectItem value="monthly">Mensal</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>
            </form>
        </div>
    );
}
