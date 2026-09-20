package com.inksa.entregador;

import android.annotation.SuppressLint;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.graphics.PixelFormat;
import android.os.Build;
import android.os.IBinder;
import android.provider.Settings;
import android.util.Log;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.widget.ImageView;

import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;

/**
 * A BOLINHA QUE VOLTA PRO INKSA — o atalho flutuante por cima do Waze.
 *
 * ## O PROBLEMA
 *
 * O entregador aperta "Dirigir", o Waze assume a tela inteira e não há volta: o
 * Waze não mostra botão de retorno pro app que o chamou (isso só existe pra
 * quem tem acordo de SDK com eles), e no Android um app não pode trazer outro
 * pra frente sozinho.
 *
 * A saída que já existe é a notificação fixa (`atalho-de-volta` no backend):
 * funciona, mas custa um gesto a mais — arrastar a barra e tocar. Em cima de
 * uma moto, esse gesto a mais é o que decide se ele usa ou não.
 *
 * Esta bolinha é o mesmo atalho com UM toque, e é o que o iFood faz.
 *
 * ## POR QUE ISTO NÃO PODE SER FEITO EM JAVASCRIPT
 *
 * Desenhar por cima de OUTRO app é privilégio do sistema, liberado pela
 * permissão especial `SYSTEM_ALERT_WINDOW`. Nenhuma página web faz isso, então
 * não há como chegar por OTA: só entra em APK novo. Ver
 * [[inksa-mobile-armadilhas]] — a mesma fronteira do som em res/raw.
 *
 * ## A PERMISSÃO É ESPECIAL, E ISSO MUDA O FLUXO
 *
 * `SYSTEM_ALERT_WINDOW` não tem diálogo de "permitir?". O app precisa ABRIR a
 * tela de configurações do Android e o entregador marca lá. Por isso:
 *
 *   • `podeDesenhar()` é checado ANTES de qualquer tentativa — sem ele, o
 *     `addView` lança e o serviço morre calado;
 *   • `pedirPermissao()` leva direto pra tela certa, com o app já selecionado;
 *   • quem não autorizar continua com a notificação fixa. A bolinha é melhoria,
 *     não substituição — e é por isso que o backend continua mandando o push.
 *
 * ## O QUE FALTA PRA LIGAR (deliberadamente NÃO feito ainda)
 *
 * 1. `AndroidManifest.xml`: declarar a permissão e o serviço.
 * 2. Um plugin Capacitor de três métodos (`podeDesenhar`, `pedirPermissao`,
 *    `mostrar`/`esconder`) pro JS chamar quando abrir o Waze.
 * 3. Um ícone `ic_bolha` em res/drawable.
 *
 * Está assim porque a bolinha depende de um APK novo, e o APK de hoje está
 * parado esperando a declaração do Play Console. Subir o manifesto agora
 * mudaria a lista de permissões do pacote sem que ele possa ser publicado — e
 * permissão a mais num envio já travado é pedir para ser olhado com lupa.
 *
 * ⚠️ Quando for ligar: `SYSTEM_ALERT_WINDOW` é permissão que o Google revisa.
 * Pra app de entrega com navegação é uso reconhecido (iFood, Uber), mas
 * precisa de justificativa no envio — não empilhar com outra declaração
 * pendente no mesmo release.
 */
public class BolhaDeVolta extends Service {

    private static final String TAG = "InksaBolha";
    private static final String CANAL = "inksa_bolha";
    private static final int ID_NOTIFICACAO = 7311;

    private WindowManager janelas;
    private View bolha;

    /** O entregador autorizou desenhar por cima de outros apps? */
    public static boolean podeDesenhar(Context ctx) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return true;
        return Settings.canDrawOverlays(ctx);
    }

    /** Abre a tela do Android onde a autorização é dada, já no nosso app. */
    public static void pedirPermissao(Context ctx) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return;
        Intent i = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                android.net.Uri.parse("package:" + ctx.getPackageName()));
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        ctx.startActivity(i);
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        // Sem a permissão, sair ANTES de tentar desenhar. `addView` sem
        // autorização lança BadTokenException e derruba o serviço — e o
        // entregador veria o app "fechar sozinho" ao apertar Dirigir.
        if (!podeDesenhar(this)) {
            Log.w(TAG, "sem permissao de sobreposicao; a notificacao fixa segue valendo");
            stopSelf();
            return START_NOT_STICKY;
        }
        // Serviço em primeiro plano: sem isto o Android mata o serviço em
        // segundo plano em minutos, e a bolinha sumiria no meio da viagem.
        startForeground(ID_NOTIFICACAO, construirNotificacao());
        if (bolha == null) desenharBolha();
        return START_STICKY;
    }

    @SuppressLint("ClickableViewAccessibility")
    private void desenharBolha() {
        janelas = (WindowManager) getSystemService(WINDOW_SERVICE);

        ImageView botao = new ImageView(this);
        botao.setImageResource(R.mipmap.ic_launcher);
        int lado = (int) (56 * getResources().getDisplayMetrics().density);
        botao.setPadding(8, 8, 8, 8);

        // TYPE_APPLICATION_OVERLAY é obrigatório do Android 8 pra cima; os tipos
        // antigos foram bloqueados justamente pra forçar a permissão explícita.
        int tipo = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
                : WindowManager.LayoutParams.TYPE_PHONE;

        final WindowManager.LayoutParams lp = new WindowManager.LayoutParams(
                lado, lado, tipo,
                // NOT_FOCUSABLE: a bolinha NÃO rouba o teclado nem o foco do
                // Waze. Sem isso ela engoliria toques destinados ao mapa.
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
                PixelFormat.TRANSLUCENT);
        lp.gravity = Gravity.TOP | Gravity.START;
        lp.x = 0;
        lp.y = (int) (160 * getResources().getDisplayMetrics().density);

        // ARRASTAR vs TOCAR: sem distinguir os dois, qualquer ajuste de posição
        // abriria o app no meio da rua. O limiar de ~10dp é o que separa o dedo
        // que move do dedo que aperta.
        final int limiar = (int) (10 * getResources().getDisplayMetrics().density);
        botao.setOnTouchListener(new View.OnTouchListener() {
            private int x0, y0;
            private float tx, ty;
            private boolean arrastou;

            @Override
            public boolean onTouch(View v, MotionEvent e) {
                switch (e.getAction()) {
                    case MotionEvent.ACTION_DOWN:
                        x0 = lp.x; y0 = lp.y;
                        tx = e.getRawX(); ty = e.getRawY();
                        arrastou = false;
                        return true;
                    case MotionEvent.ACTION_MOVE:
                        int dx = (int) (e.getRawX() - tx);
                        int dy = (int) (e.getRawY() - ty);
                        if (Math.abs(dx) > limiar || Math.abs(dy) > limiar) arrastou = true;
                        lp.x = x0 + dx;
                        lp.y = y0 + dy;
                        janelas.updateViewLayout(bolha, lp);
                        return true;
                    case MotionEvent.ACTION_UP:
                        if (!arrastou) voltarProApp();
                        return true;
                    default:
                        return false;
                }
            }
        });

        bolha = botao;
        try {
            janelas.addView(bolha, lp);
        } catch (Exception e) {
            Log.w(TAG, "nao deu pra desenhar a bolha", e);
            bolha = null;
            stopSelf();
        }
    }

    /** Traz o Inksa pra frente — é a única coisa que a bolinha faz. */
    private void voltarProApp() {
        Intent i = new Intent(this, MainActivity.class);
        // SINGLE_TOP + CLEAR_TOP: volta pra tela onde ele estava, sem empilhar
        // uma segunda cópia do app por cima da primeira.
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK
                | Intent.FLAG_ACTIVITY_SINGLE_TOP
                | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        startActivity(i);
    }

    private Notification construirNotificacao() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm != null && nm.getNotificationChannel(CANAL) == null) {
                NotificationChannel c = new NotificationChannel(
                        CANAL, "Atalho de volta", NotificationManager.IMPORTANCE_MIN);
                c.setDescription("Mantém o botão de voltar ao Inksa por cima do mapa.");
                c.setShowBadge(false);
                nm.createNotificationChannel(c);
            }
        }
        PendingIntent abrir = PendingIntent.getActivity(
                this, 0, new Intent(this, MainActivity.class),
                PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        return new NotificationCompat.Builder(this, CANAL)
                .setContentTitle("Corrida em andamento")
                .setContentText("Toque na bolinha para voltar ao Inksa.")
                .setSmallIcon(R.mipmap.ic_launcher)
                // IMPORTANCE_MIN + PRIORITY_MIN: o serviço exige notificação,
                // mas ela não deve competir com a voz do Waze nem piscar na
                // cara de quem está dirigindo.
                .setPriority(NotificationCompat.PRIORITY_MIN)
                .setOngoing(true)
                .setContentIntent(abrir)
                .build();
    }

    @Override
    public void onDestroy() {
        if (bolha != null && janelas != null) {
            try {
                janelas.removeView(bolha);
            } catch (Exception ignored) { /* já saiu da tela */ }
            bolha = null;
        }
        super.onDestroy();
    }
}
