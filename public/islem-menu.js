/* ============================================================
   SATIR İŞLEM BUTONLARI - HİBRİT DÜZEN (ortak script)

   Sayfalar işlem menüsünü eskisi gibi üretmeye devam eder:
     <div class="act-wrap" id="am-ID">
       <button class="act-btn" onclick="menuToggle(ID,event)">İşlemler ▾</button>
       <div class="act-drop">
         <div class="act-drop-item" onclick="...">✏️ Düzenle</div>
         <div class="act-drop-item danger" onclick="...">🗑️ Sil</div>
       </div>
     </div>
   Bu script bunu otomatik olarak şu hale çevirir:
     [✏️ Düzenle] [👁️] [⋯]   (sık işlemler satırda, gerisi ⋯ menüsünde)

   YENİ İŞLEM EKLEMEK: menüye yeni bir .act-drop-item eklemek yeterli,
   otomatik olarak ⋯ menüsüne girer. Satırda görünmesi için:
     data-oncelik="1"  -> bu işlem satırda doğrudan görünür
     data-menu="1"     -> bu işlem her zaman ⋯ menüsünde kalır
   "danger" sınıflı işlemler (Sil vb.) hiçbir zaman satıra çıkmaz.

   Öncelik sırası ve en fazla kaç işlemin satırda görüneceği aşağıda.
   ============================================================ */
(function () {
    var ONCELIK = [/düzenle|duzenle/i, /detay|görüntüle|goruntule/i];
    var MAX_GORUNUR = 2;

    var NOKTALAR = '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">' +
        '<circle cx="3" cy="8" r="1.5"/><circle cx="8" cy="8" r="1.5"/><circle cx="13" cy="8" r="1.5"/></svg>';

    function etiket(el) { return (el.textContent || '').replace(/\s+/g, ' ').trim(); }

    function ikonVeMetin(t) {
        var m = t.match(/^([^\p{L}\p{N}]+)\s*(.*)$/u);
        return m ? { ikon: m[1].trim(), metin: m[2] } : { ikon: '', metin: t };
    }

    function tehlikeli(el) { return el.classList.contains('danger'); }

    function enhance(wrap) {
        if (wrap.dataset.ah) return;
        var btn = wrap.querySelector(':scope > .act-btn');
        var drop = wrap.querySelector(':scope > .act-drop');
        if (!btn || !drop) return;
        var items = [].slice.call(drop.querySelectorAll(':scope > .act-drop-item'));
        if (!items.length) return;
        wrap.dataset.ah = '1';

        var uygun = function (x) { return !tehlikeli(x) && !x.dataset.menu; };
        var secilen = [];

        items.forEach(function (it) {
            if (it.dataset.oncelik === '1' && uygun(it)) secilen.push(it);
        });
        ONCELIK.forEach(function (re) {
            if (secilen.length >= MAX_GORUNUR) return;
            var it = items.filter(function (x) {
                return uygun(x) && secilen.indexOf(x) < 0 && re.test(etiket(x));
            })[0];
            if (it) secilen.push(it);
        });
        if (!secilen.length) {
            var ilk = items.filter(uygun)[0];
            if (ilk) secilen.push(ilk);
        }
        secilen = secilen.slice(0, MAX_GORUNUR);

        // Satırda doğrudan görünen butonlar (orijinal onclick ve data-* korunur)
        secilen.forEach(function (it, i) {
            var b = document.createElement('button');
            b.type = 'button';
            b.className = 'ah-btn' + (i > 0 ? ' ah-ikon' : '');
            [].slice.call(it.attributes).forEach(function (a) {
                if (a.name !== 'class') b.setAttribute(a.name, a.value);
            });
            var t = etiket(it), p = ikonVeMetin(t);
            b.title = p.metin || t;
            b.setAttribute('aria-label', b.title);
            b.textContent = (i === 0 || !p.ikon) ? t : p.ikon;
            if (i > 0 && !p.ikon) b.classList.remove('ah-ikon');
            wrap.insertBefore(b, btn);
            drop.removeChild(it);
        });

        // Kalanlar ⋯ menüsünde: ayraçları yeniden düzenle
        [].slice.call(drop.querySelectorAll(':scope > hr')).forEach(function (h) { h.remove(); });
        var kalan = [].slice.call(drop.querySelectorAll(':scope > .act-drop-item'));
        if (!kalan.length) {
            btn.remove();
            drop.remove();
        } else {
            var ilkTehlikeli = kalan.filter(tehlikeli)[0];
            if (ilkTehlikeli && kalan.indexOf(ilkTehlikeli) > 0) {
                drop.insertBefore(document.createElement('hr'), ilkTehlikeli);
            }
            btn.innerHTML = NOKTALAR;
            btn.title = 'Diğer işlemler';
            btn.setAttribute('aria-label', 'Diğer işlemler');
        }
        wrap.classList.add('ah');
    }

    function tara(kok) {
        if (!kok || kok.nodeType !== 1) return;
        if (kok.matches && kok.matches('.act-wrap')) enhance(kok);
        if (kok.querySelectorAll) {
            [].slice.call(kok.querySelectorAll('.act-wrap:not([data-ah])')).forEach(enhance);
        }
    }

    new MutationObserver(function (muts) {
        muts.forEach(function (m) { [].slice.call(m.addedNodes).forEach(tara); });
    }).observe(document.documentElement, { childList: true, subtree: true });

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { tara(document.body); });
    else tara(document.body);
})();
