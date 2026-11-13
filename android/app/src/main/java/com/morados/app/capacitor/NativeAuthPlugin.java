package com.morados.app.capacitor;

import android.content.DialogInterface;
import android.graphics.Color;
import android.text.InputType;
import android.util.Patterns;
import android.util.TypedValue;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.view.inputmethod.EditorInfo;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.appcompat.app.AlertDialog;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Formulário de credenciais em controles EditText nativos do Android.
 * Nenhum campo HTML do WebView recebe foco nesta etapa.
 */
@CapacitorPlugin(name = "NativeAuth")
public class NativeAuthPlugin extends Plugin {
    @PluginMethod
    public void showCredentialsDialog(PluginCall call) {
        String mode = call.getString("mode");
        if (!"signin".equals(mode) && !"signup".equals(mode)) {
            call.reject("Modo de autenticação inválido.");
            return;
        }
        if (getActivity() == null || getActivity().isFinishing()) {
            call.reject("A tela do Morados não está disponível.");
            return;
        }

        call.setKeepAlive(true);
        getActivity().runOnUiThread(() -> showDialog(call, mode));
    }

    private void showDialog(PluginCall call, String mode) {
        final AtomicBoolean completed = new AtomicBoolean(false);
        final boolean isSignup = "signup".equals(mode);

        LinearLayout content = new LinearLayout(getActivity());
        content.setOrientation(LinearLayout.VERTICAL);
        int horizontal = dp(24);
        content.setPadding(horizontal, dp(8), horizontal, 0);

        TextView description = new TextView(getActivity());
        description.setText(isSignup
            ? "Informe o e-mail e escolha uma senha para criar sua conta."
            : "Digite o e-mail e a senha da sua conta para continuar.");
        description.setTextColor(Color.rgb(91, 103, 94));
        description.setTextSize(TypedValue.COMPLEX_UNIT_SP, 14);
        description.setPadding(0, 0, 0, dp(14));
        content.addView(description, new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        ));

        EditText email = new EditText(getActivity());
        email.setId(View.generateViewId());
        email.setSingleLine(true);
        email.setHint("Seu e-mail");
        email.setInputType(
            InputType.TYPE_CLASS_TEXT
                | InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS
                | InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS
        );
        email.setImeOptions(EditorInfo.IME_ACTION_NEXT);
        email.setTextSize(TypedValue.COMPLEX_UNIT_SP, 16);
        email.setTextColor(Color.rgb(39, 55, 47));
        email.setHintTextColor(Color.rgb(143, 151, 141));
        email.setAutofillHints(View.AUTOFILL_HINT_EMAIL_ADDRESS);
        content.addView(email, new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            dp(54)
        ));

        EditText password = new EditText(getActivity());
        password.setId(View.generateViewId());
        password.setSingleLine(true);
        password.setHint(isSignup ? "Crie uma senha (mínimo 8 caracteres)" : "Sua senha");
        password.setInputType(
            InputType.TYPE_CLASS_TEXT
                | InputType.TYPE_TEXT_VARIATION_PASSWORD
                | InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS
        );
        password.setImeOptions(EditorInfo.IME_ACTION_DONE);
        password.setTextSize(TypedValue.COMPLEX_UNIT_SP, 16);
        password.setTextColor(Color.rgb(39, 55, 47));
        password.setHintTextColor(Color.rgb(143, 151, 141));
        password.setAutofillHints(View.AUTOFILL_HINT_PASSWORD);
        LinearLayout.LayoutParams passwordParams = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            dp(54)
        );
        passwordParams.topMargin = dp(12);
        content.addView(password, passwordParams);
        email.setNextFocusDownId(password.getId());

        AlertDialog dialog = new AlertDialog.Builder(getActivity())
            .setTitle(isSignup ? "Criar conta no Morados" : "Entrar no Morados")
            .setView(content)
            .setPositiveButton(isSignup ? "Criar conta" : "Entrar", null)
            .setNegativeButton("Cancelar", null)
            .create();

        Runnable resolveCancelled = () -> {
            if (completed.compareAndSet(false, true)) {
                call.setKeepAlive(false);
                JSObject result = new JSObject();
                result.put("cancelled", true);
                call.resolve(result);
            }
        };

        dialog.setOnCancelListener(ignored -> resolveCancelled.run());
        dialog.setOnDismissListener(ignored -> resolveCancelled.run());
        dialog.setOnShowListener(ignored -> {
            Button submit = dialog.getButton(DialogInterface.BUTTON_POSITIVE);
            submit.setOnClickListener(view -> {
                String emailValue = email.getText() == null ? "" : email.getText().toString().trim();
                String passwordValue = password.getText() == null ? "" : password.getText().toString();

                if (emailValue.isEmpty()) {
                    email.setError("Informe seu e-mail.");
                    email.requestFocus();
                    return;
                }
                if (!Patterns.EMAIL_ADDRESS.matcher(emailValue).matches()) {
                    email.setError("Confira o formato do e-mail.");
                    email.requestFocus();
                    return;
                }
                if (passwordValue.isEmpty()) {
                    password.setError("Informe sua senha.");
                    password.requestFocus();
                    return;
                }
                if (isSignup && passwordValue.length() < 8) {
                    password.setError("Use pelo menos 8 caracteres.");
                    password.requestFocus();
                    return;
                }

                if (completed.compareAndSet(false, true)) {
                    call.setKeepAlive(false);
                    JSObject result = new JSObject();
                    result.put("cancelled", false);
                    result.put("email", emailValue);
                    result.put("password", passwordValue);
                    call.resolve(result);
                }
                dialog.dismiss();
            });
            password.setOnEditorActionListener((view, actionId, event) -> {
                if (actionId == EditorInfo.IME_ACTION_DONE) {
                    submit.performClick();
                    return true;
                }
                return false;
            });
        });

        dialog.show();
        Window window = dialog.getWindow();
        if (window != null) {
            window.setSoftInputMode(
                WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE
                    | WindowManager.LayoutParams.SOFT_INPUT_STATE_ALWAYS_HIDDEN
            );
        }
    }

    private int dp(float value) {
        return (int) (value * getContext().getResources().getDisplayMetrics().density + 0.5f);
    }
}
