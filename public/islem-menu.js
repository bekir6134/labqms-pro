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
     [✏️ Düzenle] [📄 Önizle veya 👁️] [⋯]   (sık işlemler satırda, gerisi ⋯ menüsünde)

   YENİ İŞLEM EKLEMEK: menüye yeni bir .act-drop-item eklemek yeterli,
   otomatik olarak ⋯ menüsüne girer. Satırda görünmesi için:
     data-oncelik="1"  -> bu işlem satırda doğrudan görünür
     data-menu="1"     -> bu işlem her zaman ⋯ menüsünde kalır
   "danger" sınıflı işlemler (Sil vb.) hiçbir zaman satıra çıkmaz.

   Öncelik sırası ve en fazla kaç işlemin satırda görüneceği aşağıda.
   ============================================================ */
(function () {
    // Sırayla aranır. yazili:true olanlar ikon + yazı, diğerleri sadece ikon olarak görünür.
    var ONCELIK = [
        { re: /düzenle|duzenle/i, yazili: true },
        { re: /önizle|onizle|önizleme/i, yazili: true },
        { re: /detay|görüntüle|goruntule/i, yazili: false }
    ];
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
        var secilen = [];   // { el, yazili }
        var var_ = function (x) { return secilen.some(function (k) { return k.el === x; }); };

        items.forEach(function (it) {
            if (it.dataset.oncelik === '1' && uygun(it)) secilen.push({ el: it, yazili: false });
        });
        ONCELIK.forEach(function (o) {
            if (secilen.length >= MAX_GORUNUR) return;
            var it = items.filter(function (x) {
                return uygun(x) && !var_(x) && o.re.test(etiket(x));
            })[0];
            if (it) secilen.push({ el: it, yazili: o.yazili });
        });
        if (!secilen.length) {
            var ilk = items.filter(uygun)[0];
            if (ilk) secilen.push({ el: ilk, yazili: true });
        }
        secilen = secilen.slice(0, MAX_GORUNUR);
        secilen[0] && (secilen[0].yazili = true);   // ilk buton her zaman yazılı

        // Satırda doğrudan görünen butonlar (orijinal onclick ve data-* korunur)
        secilen.forEach(function (k) {
            var it = k.el;
            var b = document.createElement('button');
            b.type = 'button';
            [].slice.call(it.attributes).forEach(function (a) {
                if (a.name !== 'class') b.setAttribute(a.name, a.value);
            });
            var t = etiket(it), p = ikonVeMetin(t);
            b.title = p.metin || t;
            b.setAttribute('aria-label', b.title);
            if (k.yazili || !p.ikon) {
                b.className = 'ah-btn';
                // "📄 PDF Önizle" gibi uzun etiketleri satırda kısalt: "📄 Önizle"
                b.textContent = (p.ikon ? p.ikon + ' ' : '') + (p.metin || t).replace(/^PDF\s+/i, '');
            } else {
                b.className = 'ah-btn ah-ikon';
                b.textContent = p.ikon;
            }
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
