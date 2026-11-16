package com.morados.app.capacitor;

import android.content.Context;
import android.content.DialogInterface;
import android.graphics.Color;
import android.text.InputFilter;
import android.text.InputType;
import android.util.Patterns;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.view.inputmethod.EditorInfo;
import android.view.inputmethod.InputMethodManager;
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
import java.util.Locale;

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
            ? "Informe dois e-mails distintos e uma senha compartilhada."
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

        EditText partnerEmail = new EditText(getActivity());
        partnerEmail.setId(View.generateViewId());
        partnerEmail.setSingleLine(true);
        partnerEmail.setHint("E-mail da sua namorada");
        partnerEmail.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS);
        partnerEmail.setImeOptions(EditorInfo.IME_ACTION_NEXT);
        if (isSignup) content.addView(partnerEmail, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(54)));

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
        email.setNextFocusDownId(isSignup ? partnerEmail.getId() : password.getId());
        partnerEmail.setNextFocusDownId(password.getId());

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
                String emailValue = email.getText() == null ? "" : email.getText().toString().trim().toLowerCase(Locale.ROOT);
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
                String partnerValue = partnerEmail.getText() == null ? "" : partnerEmail.getText().toString().trim().toLowerCase(Locale.ROOT);
                if (isSignup && (!Patterns.EMAIL_ADDRESS.matcher(partnerValue).matches() || partnerValue.equals(emailValue))) {
                    partnerEmail.setError("Informe outro e-mail válido e diferente do seu.");
                    partnerEmail.requestFocus();
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
                    if (isSignup) result.put("partnerEmail", partnerValue);
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


    @PluginMethod
    public void showTextInputDialog(PluginCall call) {
        if (getActivity() == null || getActivity().isFinishing()) {
            call.reject("A tela do Morados não está disponível.");
            return;
        }

        String title = call.getString("title", "Nova mensagem");
        String hint = call.getString("hint", "Escreva uma mensagem…");
        String initialValue = call.getString("initialValue", "");
        String confirmText = call.getString("confirmText", "Enviar");
        String descriptionText = call.getString(
            "description",
            "Sua mensagem será enviada somente para a pessoa vinculada ao seu espaço."
        );
        Integer requestedMaxLength = call.getInt("maxLength", 2000);
        int maxLength = Math.max(1, Math.min(requestedMaxLength == null ? 2000 : requestedMaxLength, 5000));
        boolean singleLine = call.getBoolean("singleLine", false);
        boolean allowEmpty = call.getBoolean("allowEmpty", false);

        call.setKeepAlive(true);
        getActivity().runOnUiThread(() -> {
            final AtomicBoolean completed = new AtomicBoolean(false);
            LinearLayout content = new LinearLayout(getActivity());
            content.setOrientation(LinearLayout.VERTICAL);
            int horizontal = dp(24);
            content.setPadding(horizontal, dp(8), horizontal, 0);

            TextView description = new TextView(getActivity());
            description.setText(descriptionText);
            description.setTextColor(Color.rgb(91, 103, 94));
            description.setTextSize(TypedValue.COMPLEX_UNIT_SP, 13);
            description.setPadding(0, 0, 0, dp(10));
            content.addView(description, new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ));

            EditText editor = new EditText(getActivity());
            editor.setId(View.generateViewId());
            editor.setSingleLine(singleLine);
            editor.setMinLines(singleLine ? 1 : 3);
            editor.setMaxLines(singleLine ? 1 : 6);
            editor.setGravity(singleLine ? Gravity.CENTER_VERTICAL | Gravity.START : Gravity.TOP | Gravity.START);
            editor.setHint(hint);
            editor.setText(initialValue);
            editor.setSelection(editor.length());
            editor.setInputType(
                InputType.TYPE_CLASS_TEXT
                    | (singleLine
                        ? InputType.TYPE_TEXT_FLAG_CAP_CHARACTERS | InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS
                        : InputType.TYPE_TEXT_FLAG_MULTI_LINE | InputType.TYPE_TEXT_FLAG_CAP_SENTENCES)
            );
            editor.setImeOptions(EditorInfo.IME_ACTION_DONE);
            editor.setTextSize(TypedValue.COMPLEX_UNIT_SP, 16);
            editor.setTextColor(Color.rgb(39, 55, 47));
            editor.setHintTextColor(Color.rgb(143, 151, 141));
            editor.setPadding(dp(12), dp(12), dp(12), dp(12));
            editor.setFilters(new InputFilter[]{new InputFilter.LengthFilter(maxLength)});
            content.addView(editor, new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                dp(singleLine ? 54 : 132)
            ));

            AlertDialog dialog = new AlertDialog.Builder(getActivity())
                .setTitle(title)
                .setView(content)
                .setPositiveButton(confirmText, null)
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
                    String text = editor.getText() == null ? "" : editor.getText().toString();
                    if (!allowEmpty && text.trim().isEmpty()) {
                        editor.setError("Preencha este campo.");
                        editor.requestFocus();
                        return;
                    }

                    if (completed.compareAndSet(false, true)) {
                        call.setKeepAlive(false);
                        JSObject result = new JSObject();
                        result.put("cancelled", false);
                        result.put("text", text);
                        call.resolve(result);
                    }
                    dialog.dismiss();
                });
                editor.setOnEditorActionListener((view, actionId, event) -> {
                    if (actionId == EditorInfo.IME_ACTION_DONE) {
                        submit.performClick();
                        return true;
                    }
                    return false;
                });

                editor.requestFocus();
                Window window = dialog.getWindow();
                if (window != null) {
                    window.setSoftInputMode(
                        WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE
                            | WindowManager.LayoutParams.SOFT_INPUT_STATE_ALWAYS_VISIBLE
                    );
                }
                editor.post(() -> {
                    InputMethodManager inputMethod = (InputMethodManager) getActivity()
                        .getSystemService(Context.INPUT_METHOD_SERVICE);
                    if (inputMethod != null) inputMethod.showSoftInput(editor, InputMethodManager.SHOW_IMPLICIT);
                });
            });
            dialog.show();
        });
    }

    private int dp(float value) {
        return (int) (value * getContext().getResources().getDisplayMetrics().density + 0.5f);
    }
}
