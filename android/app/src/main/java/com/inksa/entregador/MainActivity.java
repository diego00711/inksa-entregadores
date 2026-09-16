package com.inksa.entregador;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    /**
     * Canal do aviso de corrida nova.
     *
     * ⚠️ É `_v2` PORQUE O ANDROID NÃO DEIXA MUDAR CANAL DEPOIS DE CRIADO.
     * Som, volume e importância congelam na primeira criação e passam a
     * pertencer ao usuário, nas configurações do sistema. O `inksa_urgente`
     * antigo nasceu com `sound: "default"` e vai continuar assim pra sempre em
     * quem já abriu o app — não adianta editar, tem que ser id novo.
     */
    private static final String CANAL_CORRIDA = "inksa_urgente_v2";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // ⚠️ ANTES do super.onCreate: é ele que monta a ponte e carrega a lista
        // de plugins. Registrar depois compila, instala, e o plugin simplesmente
        // não existe pro JavaScript — "Turno is not implemented on android".
        registerPlugin(HeartbeatPlugin.class);
        super.onCreate(savedInstanceState);
        criarCanalDaCorrida();
    }

    /**
     * POR QUE ISTO ESTÁ NO NATIVO, E NÃO NO JAVASCRIPT COMO O CANAL ANTIGO.
     *
     * Duas coisas que o `PushNotifications.createChannel` do Capacitor não
     * consegue fazer, e as duas são exatamente a reclamação do entregador em
     * 16/09/2026 — "o tok tá baixo", "se tiver andando de moto não escuta",
     * "e ele não sobe":
     *
     *  1. USAGE_ALARM. Som de notificação toca no fluxo de NOTIFICAÇÃO, que no
     *     Android é separado do volume que os botões laterais mexem. É por isso
     *     que "não sobe": o entregador aumentava o volume e o aviso continuava
     *     baixo. No fluxo de ALARME ele sobe junto, e alarme costuma viver perto
     *     do máximo — é o mesmo fluxo que acorda a pessoa de manhã.
     *
     *  2. Som próprio empacotado (res/raw/inksa_alerta.mp3). O `default` é o
     *     "tok" curto do sistema: grave e com menos de meio segundo. Grave some
     *     no ronco do motor, e meio segundo passa despercebido dentro do
     *     capacete. O arquivo novo são 12 bipes alternando 3400/2600 Hz por
     *     3,2 s — essa faixa é onde o ouvido é mais sensível E onde o ruído de
     *     moto é mais fraco. Mesma razão pela qual sirene e alarme de incêndio
     *     moram ali.
     *
     * ⚠️ E É PRECISO ESTAR NO MESMO ARTEFATO QUE O SOM. O JS do app atualiza
     * sozinho pelo servidor (capacitor.config: server.url), mas res/raw NÃO —
     * recurso nativo só entra em APK novo. Se a criação do canal subisse pelo
     * JS antes do APK, ela criaria o canal apontando pra um som inexistente —
     * e, como canal não se altera, ficaria quebrado PARA SEMPRE naquele
     * aparelho. Nascendo aqui, o canal e o som chegam sempre juntos.
     *
     * ⚠️ O canal antigo NÃO é apagado aqui de propósito: enquanto o backend
     * ainda mandar `inksa_urgente`, apagá-lo deixaria mudo quem não atualizou.
     * A troca é feita pelo admin (platform_settings.push_canal_entregador),
     * depois que o APK novo estiver na rua.
     */
    private void criarCanalDaCorrida() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return; // canal só existe do Oreo pra cima

        NotificationManager nm = getSystemService(NotificationManager.class);
        if (nm == null) return;
        if (nm.getNotificationChannel(CANAL_CORRIDA) != null) return; // já existe: mexer não faz nada

        NotificationChannel canal = new NotificationChannel(
                CANAL_CORRIDA,
                "Corrida nova",
                NotificationManager.IMPORTANCE_HIGH   // som + aparece por cima do que estiver aberto
        );
        canal.setDescription("Toca alto quando chega uma corrida. Use o volume de ALARME para ajustar.");

        Uri som = Uri.parse("android.resource://" + getPackageName() + "/" + R.raw.inksa_alerta);
        canal.setSound(som, new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ALARM)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build());

        canal.enableVibration(true);
        // Padrão longo e forte: o celular costuma estar no bolso, não na mão.
        canal.setVibrationPattern(new long[]{0, 500, 250, 500, 250, 800});
        canal.enableLights(true);
        canal.setLockscreenVisibility(android.app.Notification.VISIBILITY_PUBLIC);

        nm.createNotificationChannel(canal);
    }
}
