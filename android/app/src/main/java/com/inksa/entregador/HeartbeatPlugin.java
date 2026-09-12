package com.inksa.entregador;

import android.content.Intent;
import android.os.Build;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Porta entre o app (JS) e o serviço de turno (HeartbeatService).
 *
 * Só existe no APK. No navegador a chamada nem chega aqui — o
 * `Capacitor.isNativePlatform()` do lado do JS decide, e o app segue com o sinal
 * de vida em JavaScript, que é o comportamento de sempre.
 */
@CapacitorPlugin(name = "Turno")
public class HeartbeatPlugin extends Plugin {

    @PluginMethod
    public void iniciar(PluginCall call) {
        String apiUrl = call.getString("apiUrl");
        String token = call.getString("token");
        if (apiUrl == null || apiUrl.isEmpty() || token == null || token.isEmpty()) {
            call.reject("apiUrl e token são obrigatórios");
            return;
        }

        Intent i = new Intent(getContext(), HeartbeatService.class);
        i.setAction(HeartbeatService.ACTION_START);
        i.putExtra(HeartbeatService.EXTRA_API_URL, apiUrl.replaceAll("/+$", ""));
        i.putExtra(HeartbeatService.EXTRA_TOKEN, token);

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                getContext().startForegroundService(i);
            } else {
                getContext().startService(i);
            }
            call.resolve(new JSObject().put("rodando", true));
        } catch (Throwable t) {
            // A partir do Android 12 o sistema recusa iniciar serviço em primeiro
            // plano com o app em segundo plano (ForegroundServiceStartNotAllowed).
            // Não é motivo pra quebrar nada: quem chama trata como "não deu" e o
            // sinal de vida do JS continua valendo.
            call.reject("Não foi possível iniciar o serviço de turno: " + t.getMessage());
        }
    }

    @PluginMethod
    public void parar(PluginCall call) {
        Intent i = new Intent(getContext(), HeartbeatService.class);
        i.setAction(HeartbeatService.ACTION_STOP);
        try {
            getContext().startService(i);
        } catch (Throwable ignored) {
            // Serviço já morto: parar o que não está rodando não é erro.
        }
        call.resolve(new JSObject().put("rodando", false));
    }

    @PluginMethod
    public void estaRodando(PluginCall call) {
        call.resolve(new JSObject().put("rodando", HeartbeatService.estaRodando()));
    }
}
