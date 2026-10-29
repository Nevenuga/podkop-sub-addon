'use strict';
'require view';
'require form';
'require uci';
'require fs';
'require ui';

return view.extend({
  render: function () {
    var m, s, o;

    m = new form.Map('podkop-sub', _('Подписка Podkop'),
      _('Загрузка списка серверов из ссылки-подписки в podkop.'));

    s = m.section(form.NamedSection, 'main', 'subscription');

    o = s.option(form.Value, 'url', _('Ссылка подписки'));
    o.placeholder = 'https://example.com/sub/TOKEN';

    o = s.option(form.Value, 'hwid', _('HWID (идентификатор устройства)'),
      _('Уходит в заголовок x-hwid при каждом обновлении. Панели считают ' +
        'разные значения разными устройствами и списывают их на лимит. ' +
        'Оставьте пустым — при первом обновлении id сгенерируется из ' +
        'MAC-адреса и сохранится сюда. Впишите своё значение или очистите ' +
        'поле и сохраните, чтобы занять новый слот на панели — вступит в ' +
        'силу со следующего обновления.'));
    o.placeholder = _('создаётся автоматически при первом обновлении');
    o.rmempty = true;

    o = s.option(form.Flag, 'auto_update', _('Автообновление'),
      _('Раз в сутки в 05:00 по часовому поясу роутера.'));
    o.default = '1';
    o.rmempty = false;

    o = s.option(form.Flag, 'filter_enabled', _('Фильтр серверов'),
      _('Серверы, попавшие под фильтр, не загружаются в podkop: они даже не ' +
        'попадают в его конфигурацию. Сколько отброшено — видно в выводе ' +
        'обновления.'));
    o.default = '1';
    o.rmempty = false;

    o = s.option(form.DynamicList, 'filter_words', _('Запрещённые слова'),
      _('Сервер отбрасывается, если в его названии — то, что идёт после «#» ' +
        'в ссылке, — есть любое из слов. Сравнение без учёта регистра, ' +
        'включая кириллицу: «сша» найдёт «США». Название в подписке хранится ' +
        'закодированным (%D0%A1 вместо «С», %F0%9F вместо эмоджи), фильтр ' +
        'сравнивает слова с уже раскодированным названием. Хост и параметры ' +
        'ссылки не учитываются.'));
    o.placeholder = _('например, США или test');
    o.depends('filter_enabled', '1');

    o = s.option(form.Value, 'filter_chars', _('Запрещённые символы'),
      _('Каждый символ из этой строки запрещён по отдельности: сервер ' +
        'отбрасывается, если такой символ есть в его названии — тоже только ' +
        'после «#» и в раскодированном виде. Осторожно с символами, которые ' +
        'есть почти в каждом названии (пробел, «|», «-») — с ними не ' +
        'останется ни одного сервера.'));
    o.placeholder = 'например, <>*';
    o.depends('filter_enabled', '1');

    o = s.option(form.Button, '_update', _('Серверы'));
    o.inputtitle = _('Загрузить');
    o.inputstyle = 'apply';
    o.onclick = ui.createHandlerFn(this, function () {
      // Save and commit first: the CLI reads the committed UCI file,
      // so an unsaved URL would silently fetch the previous one.
      // The CLI speaks English on purpose - its output goes to syslog too.
      return m.save()
        .then(function () { return uci.apply(); })
        .then(function () { return fs.exec('/usr/bin/podkop-sub', ['update']); })
        .then(function (res) {
          var out = ((res.stdout || '') + (res.stderr || '')).trim();
          ui.addNotification(null, E('pre', {}, out || _('Нет вывода')),
            res.code === 0 ? 'info' : 'error');
        });
    });

    return m.render();
  }
});
