/* ============================================================
   KAYIT FORMU POPUP (MODAL) - ortak script
   Sayfadaki #accContent açıldığında (style.display = 'block')
   formu ön planda pencere olarak gösterir, kapanınca eski haline
   döndürür. Sayfaların kendi toggle / düzenle / kaydet kodlarına
   dokunmaz; sadece gösterimi değiştirir.
   ============================================================ */
(function () {
    function init() {
        var content = document.getElementById('accContent');
        if (!content) return;
        var acc = content.closest('.accordion');
        if (!acc || acc.dataset.mfReady) return;
        acc.dataset.mfReady = '1';

        var header = acc.querySelector('.accordion-header');
        var h3 = header && header.querySelector('h3');
        var titleText = h3 ? h3.textContent.trim() : 'Kayıt';

        // Arka plan karartma
        var backdrop = document.createElement('div');
        backdrop.className = 'mf-backdrop';
        acc.insertBefore(backdrop, content);

        // Formun mevcut içeriğini gövde kabına taşı (olay dinleyiciler ve id'ler korunur)
        var body = document.createElement('div');
        body.className = 'mf-body';
        while (content.firstChild) body.appendChild(content.firstChild);

        // Pencere başlığı + kapatma butonu
        var head = document.createElement('div');
        head.className = 'mf-head';
        head.innerHTML = '<h3 class="mf-title"></h3><button type="button" class="mf-close" title="Kapat">✕</button>';
        head.querySelector('.mf-title').textContent = titleText;

        content.appendChild(head);
        content.appendChild(body);

        // "Güncelle" gibi değişen buton metinlerini kapatırken geri yüklemek için
        var saveBtns = [].slice.call(body.querySelectorAll('button')).filter(function (b) {
            return /save|submit|kaydet/i.test(b.id || '');
        });
        var saveBtnTexts = saveBtns.map(function (b) { return b.innerHTML; });

        function genericReset() {
            var forms = body.querySelectorAll('form');
            forms.forEach(function (f) { f.reset(); });
            [].slice.call(body.querySelectorAll('input, select, textarea')).forEach(function (el) {
                var t = (el.type || '').toLowerCase();
                if (t === 'hidden') {
                    if (/(^id$|_id$|^id_|edit|duzenle)/i.test(el.id || '') || /[a-z]Id$/.test(el.id || '')) el.value = '';
                } else if (t === 'checkbox' || t === 'radio') {
                    el.checked = el.defaultChecked;
                } else if (el.tagName === 'SELECT') {
                    var any = false;
                    [].slice.call(el.options).forEach(function (o) { o.selected = o.defaultSelected; if (o.defaultSelected) any = true; });
                    if (!any) el.selectedIndex = 0;
                } else if (t !== 'button' && t !== 'submit' && t !== 'file') {
                    el.value = el.defaultValue;
                }
            });
            saveBtns.forEach(function (b, i) { b.innerHTML = saveBtnTexts[i]; });
        }

        function closeForm() {
            if (typeof window.formTemizle === 'function') {
                window.formTemizle();
            } else {
                genericReset();
                if (typeof window.toggleAccordion === 'function' && content.style.display === 'block') window.toggleAccordion();
                else if (typeof window.toggleAcc === 'function' && content.style.display === 'block') window.toggleAcc();
            }
            // Sayfanın kendi fonksiyonu kapatmadıysa zorla kapat
            if (content.style.display === 'block') {
                content.style.display = 'none';
                if (header) header.classList.remove('active');
            }
        }
        window.mfKapat = closeForm;

        // Kayıt başarılı olunca pencereyi kapat (sayfanın kendi kodu bittikten sonra çalışsın diye ertelenir)
        window.mfBasarili = function () { setTimeout(closeForm, 0); };

        // Sayfanın formTemizle() fonksiyonu yalnızca kayıt sonrası ve İptal'de çağrılır:
        // formu temizlerken pencereyi de kapat
        if (typeof window.formTemizle === 'function' && !window.formTemizle.__mf) {
            var orijinalTemizle = window.formTemizle;
            var sarilmis = function () {
                var sonuc = orijinalTemizle.apply(this, arguments);
                if (content.style.display === 'block') {
                    content.style.display = 'none';
                    if (header) header.classList.remove('active');
                }
                return sonuc;
            };
            sarilmis.__mf = true;
            window.formTemizle = sarilmis;
        }

        // ✕ düğmesi: sayfa kaydedilmemiş değişiklik için onay istiyorsa (window.mfOnKapat) önce onu çalıştır
        head.querySelector('.mf-close').addEventListener('click', function () {
            if (typeof window.mfOnKapat === 'function') window.mfOnKapat(closeForm);
            else closeForm();
        });
        // Arka plana tıklayınca kapanmaz (yanlışlıkla veri kaybı olmasın)

        function sync() {
            var open = content.style.display === 'block';
            acc.classList.toggle('mf-open', open);
            document.body.classList.toggle('mf-lock', open);
            if (open) {
                content.scrollTop = 0;
                setTimeout(function () {
                    var first = body.querySelector('input:not([type=hidden]):not([disabled]):not([readonly]), select:not([disabled]), textarea:not([disabled])');
                    if (first && first.offsetParent !== null) { try { first.focus({ preventScroll: true }); } catch (e) { first.focus(); } }
                }, 60);
            }
        }

        new MutationObserver(sync).observe(content, { attributes: true, attributeFilter: ['style'] });
        sync();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
