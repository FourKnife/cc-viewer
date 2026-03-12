# CC-Viewer

Claude Code istek izleme sistemi; Claude Code'un tüm API istek ve yanıtlarını gerçek zamanlı olarak yakalar ve görselleştirir (ham metin, hiçbir şey kırpılmaz). Geliştiricilerin Vibe Coding sürecinde bağlamlarını izlemelerine, gözden geçirmelerine ve sorunları gidermelerine yardımcı olur.
CC-Viewer'ın en son sürümü ayrıca sunucu tabanlı web programlama ve mobil programlama araçları da sunmaktadır. Kendi projelerinizde kullanmaya davetlisiniz; gelecekte daha fazla eklenti işlevi açılacak ve bulut dağıtımı desteklenecektir.

İlginç kısma bakalım — bunu mobil cihazınızda görebilirsiniz:

<img width="1700" height="790" alt="image" src="https://github.com/user-attachments/assets/da3e519f-ff66-4cd2-81d1-f4e131215f6c" />

<font color="#999">(Mevcut sürümde iOS uyumluluğu tam değil; iOS optimizasyonu 2026.04.01'de yapılacak)</font>

[English](../README.md) | [繁體中文](./README.zh-TW.md) | [한국어](./README.ko.md) | [日本語](./README.ja.md) | [Deutsch](./README.de.md) | [Español](./README.es.md) | [Français](./README.fr.md) | [Italiano](./README.it.md) | [Dansk](./README.da.md) | [Polski](./README.pl.md) | [Русский](./README.ru.md) | [العربية](./README.ar.md) | [Norsk](./README.no.md) | [Português (Brasil)](./README.pt-BR.md) | [ไทย](./README.th.md) | Türkçe | [Українська](./README.uk.md) | [简体中文](./README.zh.md)

## Kullanım

### Kurulum

```bash
npm install -g cc-viewer --registry=https://registry.npmjs.org
```

### Programlama Modu

`ccv`, `claude` için birebir yedektir; tüm argümanlar claude'a iletilir ve aynı anda Web Viewer başlatılır.

```bash
ccv                    # == claude (etkileşimli mod)
ccv -c                 # == claude --continue (son konuşmaya devam et)
ccv -r                 # == claude --resume (konuşmayı sürdür)
ccv -p "hello"         # == claude --print "hello" (yazdırma modu)
ccv --d                # == claude --dangerously-skip-permissions (kısayol)
ccv --model opus       # == claude --model opus
```

Programlama modu başlatıldığında web sayfası otomatik olarak açılır.

Web sayfasında doğrudan claude kullanabilir, tam istek gövdelerini görüntüleyebilir ve kod değişikliklerini inceleyebilirsiniz.

Üstelik daha da etkileyici olan şu: mobil cihazınızdan bile programlama yapabilirsiniz!

### Logger Modu

⚠️ Hâlâ yerel claude aracını veya VS Code eklentisini kullanmayı tercih ediyorsanız bu modu kullanın.

Bu modda ```claude``` veya ```claude --dangerously-skip-permissions``` başlatıldığında istek günlükleri otomatik olarak `~/.claude/cc-viewer/*projeniz*/tarih.jsonl` dosyasına kaydedilir.

Logger modunu başlatmak için:
```bash
ccv -logger
```

Konsolda belirli bir port gösterilmediğinde varsayılan ilk başlangıç portu 127.0.0.1:7008'dir. Birden fazla örnek çalışıyorsa portlar sırayla artar: 7009, 7010 vb.

Bu komut, yerel Claude Code kurulumunu (NPM veya Native Install) otomatik olarak algılar ve buna göre uyum sağlar.

- **NPM sürümü claude code**: Claude Code'un `cli.js` dosyasına otomatik olarak bir yakalama betiği enjekte eder.
- **Native sürümü claude code**: `claude` ikili dosyasını otomatik algılar, yerel şeffaf proxy yapılandırır ve trafiği otomatik yönlendirmek için Zsh Shell Hook ayarlar.
- Bu proje, npm ile kurulu claude code kullanımını önerir.

Logger modunu kaldırmak için:
```bash
ccv --uninstall
```

### Sorun Giderme (Troubleshooting)

Başlatma sorunuyla karşılaşırsanız nihai çözüm şudur:
Adım 1: Herhangi bir dizinde Claude Code'u açın;
Adım 2: Claude Code'a aşağıdaki talimatı verin:
```
cc-viewer npm paketini kurdum ancak ccv çalıştırdıktan sonra düzgün çalışmıyor. cc-viewer'ın cli.js ve findcc.js dosyalarını incele; yerel ortama göre claude code kurulumunu uyumlu hale getir. Uyum değişikliklerini mümkün olduğunca findcc.js ile sınırlı tut.
```
Claude Code'un hatayı kendisinin incelemesi, herhangi birine danışmaktan veya herhangi bir belgeyi okumaktan çok daha etkilidir!

Yukarıdaki talimat tamamlandıktan sonra findcc.js güncellenecektir. Projeniz sık sık yerel dağıtım gerektiriyorsa veya fork edilmiş kodun kurulum sorunlarını çözmesi gerekiyorsa bu dosyayı saklayın — bir sonraki seferde doğrudan kopyalayabilirsiniz. Şu an pek çok proje ve şirket claude code'u Mac'te değil, sunucu tarafında barındırarak kullanıyor; bu nedenle yazar findcc.js dosyasını ayrı tutarak cc-viewer kaynak kodu güncellemelerinin takibini kolaylaştırdı.

### Diğer Yardımcı Komutlar

Yardım için:
```bash
ccv -h
```

### Yapılandırma Geçersiz Kılma (Configuration Override)

Özel bir API uç noktası kullanmanız gerekiyorsa (örneğin kurumsal proxy), `~/.claude/settings.json` dosyasında yapılandırın veya `ANTHROPIC_BASE_URL` ortam değişkenini ayarlayın. `ccv` bunu otomatik olarak algılar ve istekleri doğru şekilde iletir.

### Sessiz Mod (Silent Mode)

Varsayılan olarak `ccv`, `claude`'u sararken sessiz modda çalışır; terminal çıktınızın temiz kalmasını ve yerel deneyimle tutarlı olmasını sağlar. Tüm günlükler arka planda yakalanır ve `http://localhost:7008` üzerinden görüntülenebilir.

Yapılandırma tamamlandıktan sonra `claude` komutunu normal şekilde kullanın. İzleme arayüzünü görüntülemek için `http://localhost:7008` adresini ziyaret edin.


## Özellikler


### Programlama Modu

`ccv` ile başlatıldıktan sonra görebilecekleriniz:

<img width="1500" height="725" alt="image" src="https://github.com/user-attachments/assets/a64a381e-5a68-430c-b594-6d57dc01f4d3" />

Düzenleme tamamlandıktan sonra doğrudan kod farkını görüntüleyebilirsiniz:

<img width="1500" height="728" alt="image" src="https://github.com/user-attachments/assets/2a4acdaa-fc5f-4dc0-9e5f-f3273f0849b2" />

Dosyaları açıp manuel olarak düzenleyebilirsiniz, ancak bu önerilmez — bu eski usul programlama!

### Mobil Programlama

QR kodu tarayarak mobil cihazınızdan programlama yapabilirsiniz:

<img width="3018" height="1460" alt="image" src="https://github.com/user-attachments/assets/8debf48e-daec-420c-b37a-609f8b81cd20" />

Mobil programlama hayalinizi gerçeğe dönüştürür. Ayrıca bir eklenti mekanizması da mevcuttur; programlama alışkanlıklarınıza göre özelleştirme yapmak istiyorsanız ilerleyen dönemde eklenti hook güncellemelerini takip edebilirsiniz.

### Logger Modu (Claude Code tam oturumunu görüntüleme)

<img width="1500" height="720" alt="image" src="https://github.com/user-attachments/assets/519dd496-68bd-4e76-84d7-2a3d14ae3f61" />

- Claude Code tarafından gönderilen tüm API isteklerini gerçek zamanlı olarak yakalar; kırpılmış günlükler değil, ham metin (bu çok önemli!!!)
- Main Agent ve Sub Agent isteklerini otomatik olarak tanımlar ve etiketler (alt türler: Plan, Search, Bash)
- MainAgent istekleri Body Diff JSON'u destekler; önceki MainAgent isteğiyle farkı daraltılmış şekilde gösterir (yalnızca değişen/eklenen alanlar)
- Her istekte satır içi token kullanım istatistikleri (giriş/çıkış token, önbellek oluşturma/okuma, isabet oranı)
- Claude Code Router (CCR) ve diğer proxy senaryolarıyla uyumlu — API yol deseniyle istekleri eşleştirir

### Konuşma Modu

Sağ üst köşedeki "Konuşma Modu" düğmesine tıklayarak Main Agent'ın tam konuşma geçmişini sohbet arayüzüne dönüştürün:

<img width="1500" height="730" alt="image" src="https://github.com/user-attachments/assets/c973f142-748b-403f-b2b7-31a5d81e33e6" />

- Agent Team görünümü henüz desteklenmiyor
- Kullanıcı mesajları sağa hizalı (mavi balon), Main Agent yanıtları sola hizalı (koyu balon)
- `thinking` blokları varsayılan olarak daraltılmış, Markdown ile işlenmiş; genişletmek için tıklayın; tek tıkla çeviri desteklenir (özellik henüz kararlı değil)
- Kullanıcı seçim mesajları (AskUserQuestion) soru-cevap biçiminde gösterilir
- Çift yönlü mod senkronizasyonu: konuşma moduna geçildiğinde seçili isteğe karşılık gelen konuşmaya otomatik gidilir; ham moda dönüldüğünde seçili isteğe otomatik gidilir
- Ayarlar paneli: araç sonuçları ve düşünme bloklarının varsayılan daraltma durumu değiştirilebilir
- Mobil konuşma tarama: mobil CLI modunda üst çubukta "Konuşma Tarama" düğmesine tıklayarak salt okunur konuşma görünümünü kaydırın ve tam konuşma geçmişine göz atın

### İstatistik Araçları

Header alanındaki "Veri İstatistikleri" kayan paneli:

<img width="1500" height="729" alt="image" src="https://github.com/user-attachments/assets/b23f9a81-fc3d-4937-9700-e70d84e4e5ce" />

- Önbellek oluşturma/okuma sayısını ve önbellek isabet oranını gösterir
- Önbellek yeniden oluşturma istatistikleri: nedene göre gruplandırılmış (TTL, sistem/araçlar/model değişikliği, mesaj kesme/değiştirme, anahtar değişikliği) sayı ve cache_creation token'ları
- Araç kullanım istatistikleri: her aracın çağrı sıklığı çağrı sayısına göre sıralanmış
- Skill kullanım istatistikleri: her Skill'in çağrı sıklığı çağrı sayısına göre sıralanmış
- Kavram yardımı (?) simgesi: MainAgent, CacheRebuild ve çeşitli araçlar için yerleşik belgeleri görüntülemek için tıklayın

### Günlük Yönetimi

Sol üst köşedeki CC-Viewer açılır menüsü aracılığıyla:

<img width="1200" height="672" alt="image" src="https://github.com/user-attachments/assets/8cf24f5b-9450-4790-b781-0cd074cd3b39" />

- Yerel günlükleri içe aktar: geçmiş günlük dosyalarına göz at, projeye göre gruplandır, yeni pencerede aç
- Yerel JSONL dosyası yükle: görüntülemek için doğrudan yerel `.jsonl` dosyası seç (maksimum 500 MB desteklenir)
- Mevcut günlüğü farklı kaydet: izlenen JSONL günlük dosyasını indir
- Günlükleri birleştir: birden fazla JSONL günlük dosyasını tek bir oturumda birleştirerek birlikte analiz et
- Kullanıcı Prompt'larını görüntüle: tüm kullanıcı girdilerini çıkar ve göster; üç görüntüleme modu desteklenir — Ham mod (orijinal içerik), Bağlam modu (sistem etiketleri daraltılabilir), Metin modu (düz metin); eğik çizgi komutları (`/model`, `/context` vb.) bağımsız girdi olarak gösterilir; komutla ilgili etiketler Prompt içeriğinden otomatik gizlenir
- Prompt'ları TXT olarak dışa aktar: kullanıcı Prompt'larını (sistem etiketleri olmadan düz metin) yerel `.txt` dosyası olarak dışa aktar

### Otomatik Güncelleme

CC-Viewer başlatıldığında güncellemeleri otomatik olarak kontrol eder (en fazla 4 saatte bir). Aynı ana sürüm içinde (örn. 1.x.x → 1.y.z) otomatik güncelleme yapılır ve bir sonraki başlatmada geçerli olur. Ana sürüm değişikliklerinde yalnızca bildirim gösterilir.

Otomatik güncelleme, Claude Code'un genel yapılandırması olan `~/.claude/settings.json` dosyasını takip eder. Claude Code otomatik güncellemeleri devre dışı bıraktıysa (`autoUpdates: false`), CC-Viewer de otomatik güncellemeyi atlar.

### Çok Dilli Destek

CC-Viewer 18 dili destekler ve sistem dil ortamına göre otomatik olarak geçiş yapar:

简体中文 | English | 繁體中文 | 한국어 | Deutsch | Español | Français | Italiano | Dansk | 日本語 | Polski | Русский | العربية | Norsk | Português (Brasil) | ไทย | Türkçe | Українська

## Lisans

MIT
