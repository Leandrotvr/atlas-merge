package app.atlasmerge.juego;

import android.content.Intent;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.games.PlayGames;
import com.google.android.gms.games.PlayGamesSdk;
import com.google.android.gms.games.leaderboard.LeaderboardVariant;

/** Puente minimo con Google Play Games Services (marcadores). */
@CapacitorPlugin(name = "PlayGames")
public class PlayGamesPlugin extends Plugin {

    @Override
    public void load() {
        try { PlayGamesSdk.initialize(getContext()); } catch (Throwable t) { /* sin Play Games */ }
    }

    /** Devuelve { signedIn: boolean }. Inicia sesion si hace falta. */
    @PluginMethod
    public void signIn(final PluginCall call) {
        try {
            final com.google.android.gms.games.GamesSignInClient c = PlayGames.getGamesSignInClient(getActivity());
            c.isAuthenticated().addOnCompleteListener(t -> {
                boolean ok = t.isSuccessful() && t.getResult() != null && t.getResult().isAuthenticated();
                if (ok) { JSObject r = new JSObject(); r.put("signedIn", true); call.resolve(r); return; }
                c.signIn().addOnCompleteListener(t2 -> {
                    JSObject r = new JSObject();
                    r.put("signedIn", t2.isSuccessful() && t2.getResult() != null && t2.getResult().isAuthenticated());
                    call.resolve(r);
                });
            });
        } catch (Throwable e) { JSObject r = new JSObject(); r.put("signedIn", false); call.resolve(r); }
    }

    @PluginMethod
    public void submitScore(PluginCall call) {
        try {
            String id = call.getString("leaderboardId");
            Long score = call.getLong("score");
            if (id == null || score == null) { call.resolve(); return; }
            PlayGames.getLeaderboardsClient(getActivity()).submitScore(id, score);
        } catch (Throwable e) { /* sin sesion: se ignora */ }
        call.resolve();
    }

    @PluginMethod
    public void showLeaderboard(final PluginCall call) {
        try {
            String id = call.getString("leaderboardId");
            PlayGames.getLeaderboardsClient(getActivity()).getLeaderboardIntent(id)
                .addOnSuccessListener(intent -> { getActivity().startActivityForResult(intent, 9004); call.resolve(); })
                .addOnFailureListener(e -> call.reject("no_leaderboard"));
        } catch (Throwable e) { call.reject("no_leaderboard"); }
    }

    /** Posicion semanal del jugador: { rank: n } (0 si no hay puntaje). */
    @PluginMethod
    public void weeklyRank(final PluginCall call) {
        try {
            String id = call.getString("leaderboardId");
            PlayGames.getLeaderboardsClient(getActivity())
                .loadCurrentPlayerLeaderboardScore(id, LeaderboardVariant.TIME_SPAN_WEEKLY, LeaderboardVariant.COLLECTION_PUBLIC)
                .addOnSuccessListener(d -> {
                    JSObject r = new JSObject();
                    long rank = 0;
                    if (d != null && d.get() != null) rank = d.get().getRank();
                    r.put("rank", rank);
                    call.resolve(r);
                })
                .addOnFailureListener(e -> { JSObject r = new JSObject(); r.put("rank", 0); call.resolve(r); });
        } catch (Throwable e) { JSObject r = new JSObject(); r.put("rank", 0); call.resolve(r); }
    }
}
