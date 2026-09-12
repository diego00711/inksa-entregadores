package com.inksa.entregador;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.HandlerThread;
import android.os.IBinder;
import android.util.Log;

import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;

import org.json.JSONObject;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

/**
 * Mantém o entregador online enquanto ele está em turno, com o app fechado.
 *
 * O PROBLEMA QUE ISTO RESOLVE
 *
 * O sinal de vida sempre foi um setInterval dentro do WebView. Com o celular
 * bloqueado no bolso o Android congela os temporizadores do JS: o sinal para, o
 * servidor conclui (corretamente) que ninguém está lá e tira o entregador da
 * fila. Ele voltava ao app e se descobria offline sem ter desligado nada.
 *
 * Um serviço em PRIMEIRO PLANO é a única forma que o Android oferece de um app
 * continuar trabalhando de verdade em segundo plano. Em troca, ele exige uma
 * notificação permanente — que aqui é uma vantagem: o entregador vê, a qualquer
 * momento, que está em turno.
 *
 * POR QUE O TIPO É "location" E NÃO "dataSync"
 *
 * `dataSync` parece o encaixe óbvio, e é uma armadilha: desde o Android 15 ele
 * tem teto de 6 HORAS por período de 24h. Passou disso, o sistema chama
 * onTimeout() e o serviço TEM que morrer — no meio de um turno de 8 horas. O
 * tipo `location` não tem esse teto, e descreve honestamente o que fazemos:
 * mandamos a posição do entregador, que é o que o motor de despacho usa pra
 * escolher quem está perto do pedido.
 *
 * ⚠️ Isto obriga a declarar o tipo no Play Console (App content → Foreground
 * service types), com descrição e vídeo. Sem a declaração o app é rejeitado na
 * publicação. NÃO pedimos ACCESS_BACKGROUND_LOCATION: um serviço em primeiro
 * plano iniciado com o app aberto já pode ler posição em segundo plano, e essa
 * permissão dispararia a revisão pesada de localização em segundo plano.
 *
 * POR QUE O PING É FEITO AQUI, EM JAVA, E NÃO NO JS
 *
 * Manter o processo vivo não descongela os temporizadores do WebView — a página
 * escondida continua estrangulada. Se o ping continuasse no JS, o serviço
 * seguraria um app vivo que mesmo assim não avisaria ninguém. Quem bate tem que
 * ser o nativo.
 *
 * A CREDENCIAL
 *
 * Não é o token da sessão: é o token de sinal de vida do backend
 * (utils/heartbeat_token.py), que só vale em /api/delivery/heartbeat e dura 30
 * dias. Com o token de sessão (~1h) este serviço teria que renovar sozinho, e
 * como o Supabase ROTACIONA o refresh_token, ele e o app se derrubariam
 * mutuamente — o entregador seria deslogado no meio do turno.
 */
public class HeartbeatService extends Service {

    private static final String TAG = "InksaHeartbeat";

    public static final String ACTION_START = "com.inksa.entregador.HEARTBEAT_START";
    public static final String ACTION_STOP = "com.inksa.entregador.HEARTBEAT_STOP";
    public static final String EXTRA_API_URL = "apiUrl";
    public static final String EXTRA_TOKEN = "token";

    private static final String PREFS = "inksa_heartbeat";
    private static final String PREF_API_URL = "apiUrl";
    private static final String PREF_TOKEN = "token";

    /** Mesmo ritmo do sinal do JS. O servidor tolera dezenas de minutos sem sinal. */
    private static final long INTERVALO_MS = 2 * 60 * 1000L;

    /**
     * ⚠️ IMUTÁVEL DEPOIS DE INSTALADO. O Android congela as propriedades de um
     * canal na primeira criação: mudar importância ou som aqui não tem efeito em
     * quem já tem o app. Pra mudar de verdade é preciso um ID novo.
     */
    private static final String CANAL_ID = "inksa_turno";
    private static final int NOTIFICACAO_ID = 4711;

    private static volatile boolean rodando = false;

    private HandlerThread thread;
    private Handler handler;
    private LocationManager locationManager;
    private volatile Location ultimaPosicao;

    public static boolean estaRodando() {
        return rodando;
    }

    private final LocationListener ouvinteDePosicao = new LocationListener() {
        @Override
        public void onLocationChanged(Location location) {
            ultimaPosicao = location;
        }

        // Os três abaixo são abstratos nas APIs antigas (< 30). Sem eles o
        // serviço quebra em aparelho velho, que é boa parte da frota.
        @Override
        public void onStatusChanged(String provider, int status, Bundle extras) { }

        @Override
        public void onProviderEnabled(String provider) { }

        @Override
        public void onProviderDisabled(String provider) { }
    };

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String acao = intent != null ? intent.getAction() : null;

        if (ACTION_STOP.equals(acao)) {
            pararTudo();
            return START_NOT_STICKY;
        }

        SharedPreferences prefs = getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        if (intent != null && intent.getStringExtra(EXTRA_TOKEN) != null) {
            // Guarda pra sobreviver ao START_STICKY: o Android recria o serviço
            // com intent nulo depois de matar o processo por memória.
            prefs.edit()
                    .putString(PREF_API_URL, intent.getStringExtra(EXTRA_API_URL))
                    .putString(PREF_TOKEN, intent.getStringExtra(EXTRA_TOKEN))
                    .apply();
        }

        if (prefs.getString(PREF_TOKEN, null) == null) {
            // Recriado sem credencial: não há o que fazer, e um serviço em
            // primeiro plano sem função é notificação pendurada à toa.
            Log.w(TAG, "Sem credencial guardada — encerrando.");
            pararTudo();
            return START_NOT_STICKY;
        }

        entrarEmPrimeiroPlano();
        rodando = true;

        if (thread == null) {
            thread = new HandlerThread("inksa-heartbeat");
            thread.start();
            handler = new Handler(thread.getLooper());
            pedirPosicoes();
            handler.post(ciclo);
        }

        // START_STICKY: se o sistema matar o processo por pressão de memória,
        // recria o serviço. A credencial vem das prefs acima.
        return START_STICKY;
    }

    private final Runnable ciclo = new Runnable() {
        @Override
        public void run() {
            try {
                baterNoServidor();
            } catch (Throwable t) {
                // Nunca deixa o ciclo morrer: uma exceção aqui pararia o sinal
                // de vida em silêncio, que é exatamente o bug que viemos curar.
                Log.w(TAG, "Falha no ping (segue tentando): " + t.getMessage());
            }
            if (handler != null) {
                handler.postDelayed(this, INTERVALO_MS);
            }
        }
    };

    private void pedirPosicoes() {
        if (ContextCompat.checkSelfPermission(this, android.Manifest.permission.ACCESS_FINE_LOCATION)
                != PackageManager.PERMISSION_GRANTED
                && ContextCompat.checkSelfPermission(this, android.Manifest.permission.ACCESS_COARSE_LOCATION)
                != PackageManager.PERMISSION_GRANTED) {
            Log.w(TAG, "Sem permissão de localização — o sinal de vida vai sem coordenada.");
            return;
        }
        try {
            locationManager = (LocationManager) getSystemService(Context.LOCATION_SERVICE);
            if (locationManager == null) return;
            // GPS puro do framework, sem Play Services: uma dependência a menos
            // e funciona em aparelho sem Google. NETWORK primeiro porque gasta
            // muito menos bateria e a precisão de quarteirão basta pro despacho.
            for (String provedor : new String[]{LocationManager.NETWORK_PROVIDER, LocationManager.GPS_PROVIDER}) {
                if (locationManager.isProviderEnabled(provedor)) {
                    locationManager.requestLocationUpdates(
                            provedor, INTERVALO_MS, 50f, ouvinteDePosicao, thread.getLooper());
                    Location conhecida = locationManager.getLastKnownLocation(provedor);
                    if (conhecida != null && ultimaPosicao == null) {
                        ultimaPosicao = conhecida;
                    }
                }
            }
        } catch (SecurityException e) {
            Log.w(TAG, "Permissão de localização revogada em tempo de execução.");
        } catch (Throwable t) {
            Log.w(TAG, "Não consegui pedir posição: " + t.getMessage());
        }
    }

    private void baterNoServidor() throws Exception {
        SharedPreferences prefs = getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        String base = prefs.getString(PREF_API_URL, null);
        String token = prefs.getString(PREF_TOKEN, null);
        if (base == null || token == null) return;

        JSONObject corpo = new JSONObject();
        Location p = ultimaPosicao;
        if (p != null) {
            corpo.put("latitude", p.getLatitude());
            corpo.put("longitude", p.getLongitude());
        }

        HttpURLConnection con = null;
        try {
            con = (HttpURLConnection) new URL(base + "/api/delivery/heartbeat").openConnection();
            con.setRequestMethod("POST");
            con.setRequestProperty("Content-Type", "application/json");
            con.setRequestProperty("Authorization", "Bearer " + token);
            con.setConnectTimeout(15000);
            con.setReadTimeout(15000);
            con.setDoOutput(true);
            try (OutputStream os = con.getOutputStream()) {
                os.write(corpo.toString().getBytes(StandardCharsets.UTF_8));
            }
            int status = con.getResponseCode();
            if (status == 401 || status == 403) {
                // Credencial vencida ou revogada. Insistir de 2 em 2 minutos por
                // 30 dias seria bater numa porta fechada gastando bateria. O app
                // emite uma nova na próxima vez que o entregador ficar online.
                Log.w(TAG, "Credencial recusada (" + status + ") — encerrando o serviço.");
                prefs.edit().remove(PREF_TOKEN).apply();
                pararTudo();
            }
        } finally {
            if (con != null) con.disconnect();
        }
    }

    private void entrarEmPrimeiroPlano() {
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && nm != null) {
            NotificationChannel canal = new NotificationChannel(
                    CANAL_ID, "Turno em andamento", NotificationManager.IMPORTANCE_LOW);
            canal.setDescription("Mostra que você está online e pronto para receber entregas.");
            canal.setShowBadge(false);
            nm.createNotificationChannel(canal);
        }

        Intent abrir = new Intent(this, MainActivity.class);
        abrir.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;  // obrigatório a partir do Android 12
        }
        PendingIntent toque = PendingIntent.getActivity(this, 0, abrir, flags);

        Notification n = new NotificationCompat.Builder(this, CANAL_ID)
                .setContentTitle("Você está ONLINE na Inksa")
                .setContentText("Recebendo pedidos. Toque para abrir.")
                .setSmallIcon(R.drawable.ic_stat_inksa)
                .setContentIntent(toque)
                .setOngoing(true)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .setCategory(NotificationCompat.CATEGORY_SERVICE)
                .build();

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICACAO_ID, n,
                    android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION);
        } else {
            startForeground(NOTIFICACAO_ID, n);
        }
    }

    private void pararTudo() {
        rodando = false;
        if (locationManager != null) {
            try {
                locationManager.removeUpdates(ouvinteDePosicao);
            } catch (Throwable ignored) { }
            locationManager = null;
        }
        if (handler != null) {
            handler.removeCallbacksAndMessages(null);
            handler = null;
        }
        if (thread != null) {
            thread.quitSafely();
            thread = null;
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            stopForeground(Service.STOP_FOREGROUND_REMOVE);
        } else {
            stopForeground(true);
        }
        stopSelf();
    }

    @Override
    public void onDestroy() {
        pararTudo();
        super.onDestroy();
    }
}
