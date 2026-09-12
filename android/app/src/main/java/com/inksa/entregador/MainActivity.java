package com.inksa.entregador;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // ⚠️ ANTES do super.onCreate: é ele que monta a ponte e carrega a lista
        // de plugins. Registrar depois compila, instala, e o plugin simplesmente
        // não existe pro JavaScript — "Turno is not implemented on android".
        registerPlugin(HeartbeatPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
