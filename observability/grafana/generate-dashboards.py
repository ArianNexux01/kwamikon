"""Gera os dashboards do Grafana.

Uso: python observability/grafana/generate-dashboards.py observability/grafana/dashboards
"""
import json
import sys
from pathlib import Path

OUT = Path(sys.argv[1])
PROM = {"type": "prometheus", "uid": "prometheus"}
TEMPO = {"type": "tempo", "uid": "tempo"}

API = 'job="kwamikon-api"'
FS = 'fstype!~"tmpfs|overlay|squashfs|fuse.*|ramfs|nsfs|devtmpfs"'


class Board:
    def __init__(self):
        self.panels = []
        self.y = 0
        self.x = 0
        self.row_h = 0
        self.next_id = 1

    def _place(self, w, h):
        if self.x + w > 24:
            self.y += self.row_h
            self.x = 0
            self.row_h = 0
        pos = {"x": self.x, "y": self.y, "w": w, "h": h}
        self.x += w
        self.row_h = max(self.row_h, h)
        return pos

    def row(self, title):
        if self.x:
            self.y += self.row_h
        self.x = 0
        self.row_h = 0
        self.panels.append({
            "type": "row", "title": title, "id": self.next_id, "collapsed": False,
            "gridPos": {"x": 0, "y": self.y, "w": 24, "h": 1}, "panels": [],
        })
        self.next_id += 1
        self.y += 1

    def add(self, panel, w, h):
        panel["id"] = self.next_id
        self.next_id += 1
        panel["gridPos"] = self._place(w, h)
        self.panels.append(panel)


def target(expr, legend="", instant=False, fmt=None, ref="A"):
    t = {"datasource": PROM, "expr": expr, "legendFormat": legend, "refId": ref}
    if instant:
        t["instant"] = True
        t["range"] = False
    if fmt:
        t["format"] = fmt
    return t


def thresholds(steps):
    """steps: [(cor, valor_a_partir_de), ...]; o primeiro é a base."""
    out = [{"color": steps[0][0], "value": None}]
    out += [{"color": c, "value": v} for c, v in steps[1:]]
    return {"mode": "absolute", "steps": out}


def stat(title, expr, unit="short", desc="", steps=None, decimals=None, color_mode="value", graph=True):
    defaults = {"unit": unit, "thresholds": thresholds(steps or [("blue", None)]), "color": {"mode": "thresholds"},
                "noValue": "Sem dados"}
    if decimals is not None:
        defaults["decimals"] = decimals
    return {
        "type": "stat", "title": title, "description": desc, "datasource": PROM,
        "targets": [target(expr)],
        "fieldConfig": {"defaults": defaults, "overrides": []},
        "options": {
            "reduceOptions": {"calcs": ["lastNotNull"], "fields": "", "values": False},
            "colorMode": color_mode, "graphMode": "area" if graph else "none",
            "justifyMode": "auto", "textMode": "auto", "orientation": "auto",
        },
    }


def timeseries(title, targets, unit="short", desc="", stack=False, bars=False, fill=10, minv=None, maxv=None):
    custom = {
        "drawStyle": "bars" if bars else "line", "lineWidth": 2, "fillOpacity": 80 if bars else fill,
        "showPoints": "never", "spanNulls": True, "lineInterpolation": "smooth",
        "stacking": {"mode": "normal" if stack else "none", "group": "A"},
    }
    defaults = {"unit": unit, "custom": custom, "color": {"mode": "palette-classic"}}
    if minv is not None:
        defaults["min"] = minv
    if maxv is not None:
        defaults["max"] = maxv
    return {
        "type": "timeseries", "title": title, "description": desc, "datasource": PROM,
        "targets": targets,
        "fieldConfig": {"defaults": defaults, "overrides": []},
        "options": {
            "legend": {"displayMode": "list", "placement": "bottom", "showLegend": True},
            "tooltip": {"mode": "multi", "sort": "desc"},
        },
    }


def bargauge(title, expr, legend, unit="short", desc=""):
    return {
        "type": "bargauge", "title": title, "description": desc, "datasource": PROM,
        "targets": [target(expr, legend, instant=True)],
        "fieldConfig": {"defaults": {"unit": unit, "color": {"mode": "palette-classic"}, "min": 0,
                                     "noValue": "Ainda sem registos",
                                     "thresholds": thresholds([("blue", None)])}, "overrides": []},
        "options": {
            "orientation": "horizontal", "displayMode": "gradient", "showUnfilled": True,
            "reduceOptions": {"calcs": ["lastNotNull"], "fields": "", "values": False},
            "valueMode": "color", "namePlacement": "top", "sizing": "auto",
        },
    }


def pie(title, expr, legend, desc=""):
    return {
        "type": "piechart", "title": title, "description": desc, "datasource": PROM,
        "targets": [target(expr, legend, instant=True)],
        "fieldConfig": {"defaults": {"unit": "short", "color": {"mode": "palette-classic"}}, "overrides": []},
        "options": {
            "pieType": "donut", "displayLabels": ["percent"],
            "legend": {"displayMode": "table", "placement": "right", "showLegend": True, "values": ["value", "percent"]},
            "reduceOptions": {"calcs": ["lastNotNull"], "fields": "", "values": False},
            "tooltip": {"mode": "single"},
        },
    }


def traces_table(title, query, desc=""):
    return {
        "type": "table", "title": title, "description": desc, "datasource": TEMPO,
        "targets": [{"datasource": TEMPO, "queryType": "traceql", "query": query, "limit": 20,
                     "tableType": "traces", "refId": "A"}],
        "fieldConfig": {"defaults": {}, "overrides": []},
        "options": {"showHeader": True, "cellHeight": "sm"},
    }


def text(content, title=""):
    return {"type": "text", "title": title, "options": {"mode": "markdown", "content": content}}


def dashboard(uid, title, board, desc, tags, variables=None, refresh="30s", time_from="now-24h"):
    # Ligação por etiqueta (não por URL) para funcionar também em /grafana/.
    links = [{"title": "Dashboards", "type": "dashboards", "tags": ["kwamikon"], "asDropdown": False,
              "includeVars": False, "keepTime": True}]
    return {
        "uid": uid, "title": title, "description": desc, "tags": tags,
        "timezone": "Africa/Luanda", "editable": False, "graphTooltip": 1,
        "refresh": refresh, "schemaVersion": 39, "version": 1,
        "time": {"from": time_from, "to": "now"},
        "templating": {"list": variables or []},
        "annotations": {"list": []},
        "links": links,
        "panels": board.panels,
    }


# --------------------------------------------------------------------------- visitantes
b = Board()
b.row("Agora")
b.add(stat("Visitantes activos agora", "kwamikon_visitors_active",
           desc="Visitantes distintos com páginas vistas nos últimos 5 minutos.",
           steps=[("blue", None)]), 4, 5)
b.add(stat("Visitantes únicos hoje", 'kwamikon_visitors_unique{period="today"}',
           desc="Desde as 00:00 de hoje (hora de Luanda)."), 4, 5)
b.add(stat("Sessões hoje", 'kwamikon_sessions{period="today"}'), 4, 5)
b.add(stat("Páginas vistas hoje", 'kwamikon_page_views_by_period{period="today"}'), 4, 5)
b.add(stat("Visitantes únicos (7 dias)", 'kwamikon_visitors_unique{period="7d"}'), 4, 5)
b.add(stat("Visitantes únicos (total)", 'kwamikon_visitors_unique{period="all"}',
           desc="Desde o início da recolha (tabela PageView)."), 4, 5)

b.row("Tráfego")
b.add(timeseries("Visitantes activos", [target("kwamikon_visitors_active", "activos agora")],
                 desc="Evolução do número de visitantes activos (janela de 5 minutos).", fill=25, minv=0), 12, 8)
b.add(timeseries("Visitantes únicos e sessões (hoje)", [
    target('kwamikon_visitors_unique{period="today"}', "visitantes únicos", ref="A"),
    target('kwamikon_sessions{period="today"}', "sessões", ref="B"),
    target('kwamikon_page_views_by_period{period="today"}', "páginas vistas", ref="C"),
], desc="Contagens acumuladas do dia; voltam a zero à meia-noite de Luanda.", minv=0), 12, 8)
b.add(timeseries("Páginas vistas por página",
                 [target("sum by (path) (increase(kwamikon_page_views_total[$__rate_interval]))", "{{path}}")],
                 stack=True, bars=True, minv=0), 24, 8)
b.add(bargauge("Páginas mais vistas (${periodo:text})",
               'sort_desc(kwamikon_page_views_by_path{period="$periodo"})', "{{path}}",
               desc="Período escolhido no seletor \"Período\" no topo do dashboard."), 8, 9)
b.add(pie("Origem das sessões", 'kwamikon_sessions_by_source{period="$periodo"}', "{{source}}",
          desc="Primeira página de cada sessão: utm_source do link ou site de onde o visitante veio."), 8, 9)
b.add(pie("Dispositivo", 'kwamikon_visitors_by_device{period="$periodo"}', "{{device}}",
          desc="Visitantes únicos por tipo de dispositivo."), 4, 9)
b.add(pie("Novos vs recorrentes", 'kwamikon_visitors_by_type{period="$periodo"}',
          "{{visitor_type}}", desc="Novo: a primeira visita deste browser foi dentro do período."), 4, 9)
b.add(timeseries("Sessões por origem",
                 [target("sum by (source) (increase(kwamikon_visits_total[$__rate_interval]))", "{{source}}")],
                 stack=True, bars=True, minv=0), 24, 8)

b.row("Experiência no browser (Core Web Vitals, percentil 75)")
vital = "histogram_quantile(0.75, sum by (le) (rate(kwamikon_web_vital_duration_seconds_bucket{{metric=\"{m}\"}}[$__range])))"
b.add(stat("LCP", vital.format(m="LCP"), unit="s", graph=False, decimals=2,
           desc="Largest Contentful Paint: tempo até o conteúdo principal aparecer. Bom < 2,5 s; mau > 4 s.",
           steps=[("green", None), ("orange", 2.5), ("red", 4)]), 5, 5)
b.add(stat("INP", vital.format(m="INP"), unit="s", graph=False, decimals=2,
           desc="Interaction to Next Paint: resposta a cliques e toques. Bom < 200 ms; mau > 500 ms.",
           steps=[("green", None), ("orange", 0.2), ("red", 0.5)]), 5, 5)
b.add(stat("CLS", "histogram_quantile(0.75, sum by (le) (rate(kwamikon_web_vital_cls_bucket[$__range])))",
           graph=False, decimals=3,
           desc="Cumulative Layout Shift: quanto a página salta enquanto carrega. Bom < 0,1; mau > 0,25.",
           steps=[("green", None), ("orange", 0.1), ("red", 0.25)]), 4, 5)
b.add(stat("FCP", vital.format(m="FCP"), unit="s", graph=False, decimals=2,
           desc="First Contentful Paint. Bom < 1,8 s; mau > 3 s.",
           steps=[("green", None), ("orange", 1.8), ("red", 3)]), 5, 5)
b.add(stat("TTFB", vital.format(m="TTFB"), unit="s", graph=False, decimals=2,
           desc="Time to First Byte: tempo até o servidor começar a responder. Bom < 0,8 s; mau > 1,8 s.",
           steps=[("green", None), ("orange", 0.8), ("red", 1.8)]), 5, 5)
b.add(timeseries("LCP p75 por dispositivo", [target(
    "histogram_quantile(0.75, sum by (le, device) (rate(kwamikon_web_vital_duration_seconds_bucket{metric=\"LCP\"}[$__rate_interval])))",
    "{{device}}")], unit="s", minv=0), 24, 7)

b.row("Vendas")
b.add(stat("Bilhetes vendidos", "sum(kwamikon_tickets_sold) or vector(0)",
           desc="Soma das quantidades das reservas confirmadas ou já utilizadas.", steps=[("green", None)]), 4, 5)
b.add(stat("Receita bilhetes", 'kwamikon_revenue{product="bilhetes"}', unit="suffix: Kz",
           desc="Pagamentos Vero com estado paid.", steps=[("green", None)]), 5, 5)
b.add(stat("Receita torneios", 'kwamikon_revenue{product="torneios"}', unit="suffix: Kz",
           steps=[("green", None)]), 5, 5)
b.add(stat("Reservas pendentes", 'sum(kwamikon_reservations{status="PENDENTE"}) or vector(0)',
           steps=[("blue", None)]), 5, 5)
b.add(stat("Entradas no recinto", "sum(kwamikon_checkins) or vector(0)",
           desc="Check-ins registados em todos os dias do evento.", steps=[("purple", None)]), 5, 5)
b.add(timeseries("Receita acumulada", [target("sum by (product) (kwamikon_revenue)", "{{product}}")],
                 unit="suffix: Kz", minv=0), 12, 8)
b.add(timeseries("Bilhetes vendidos por tipo", [target("kwamikon_tickets_sold", "{{ticket_type}}")],
                 stack=True, minv=0), 12, 8)
b.add(bargauge("Reservas por estado", "kwamikon_reservations", "{{status}}"), 6, 8)
b.add(bargauge("Pagamentos por estado", "sum by (product, status) (kwamikon_payments)",
               "{{product}} · {{status}}"), 6, 8)
b.add(bargauge("Check-ins por dia", "kwamikon_checkins", "{{event_day}}"), 6, 8)
b.add(bargauge("Inscrições em torneios", 'sum by (tournament) (kwamikon_tournament_entries{status!="CANCELADO"})',
               "{{tournament}}", desc="Inscrições pendentes ou confirmadas."), 6, 8)

periods = [("Hoje", "today"), ("Últimas 24 h", "24h"), ("Últimos 7 dias", "7d"), ("Desde o início", "all")]
period_var = {
    "name": "periodo", "label": "Período", "type": "custom",
    "description": "Período das distribuições (páginas, origem, dispositivo), calculadas na base de dados.",
    "query": ",".join(f"{t} : {v}" for t, v in periods),
    "current": {"selected": True, "text": "Hoje", "value": "today"},
    "options": [{"selected": v == "today", "text": t, "value": v} for t, v in periods],
    "includeAll": False, "multi": False,
}
(OUT / "kwamikon-visitantes.json").write_text(json.dumps(dashboard(
    "kwamikon-visitantes", "Kwamikon · Visitantes e vendas", b,
    "Visitantes, origem do tráfego, Web Vitals e vendas do Kwamikon Nexus.", ["kwamikon"],
    variables=[period_var]),
    ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

# --------------------------------------------------------------------------- API
H = f'http_server_request_duration_seconds'
b = Board()
b.row("Resumo")
b.add(stat("Pedidos por segundo", f"sum(rate({H}_count{{{API}}}[$__rate_interval]))", unit="reqps",
           decimals=2), 6, 5)
b.add(stat("Erros 5xx", f'(sum(rate({H}_count{{{API},http_response_status_code=~"5.."}}[5m])) or vector(0)) / sum(rate({H}_count{{{API}}}[5m]))',
           unit="percentunit", decimals=2, desc="Percentagem de pedidos com resposta 5xx nos últimos 5 minutos.",
           steps=[("green", None), ("orange", 0.01), ("red", 0.05)]), 6, 5)
b.add(stat("Latência p95", f"histogram_quantile(0.95, sum by (le) (rate({H}_bucket{{{API}}}[5m])))", unit="s",
           decimals=3, steps=[("green", None), ("orange", 0.5), ("red", 1.5)]), 6, 5)
b.add(stat("Memória do processo", f"process_memory_usage{{{API}}}", unit="bytes",
           desc="Memória residente (RSS) do processo Node da API."), 6, 5)

b.row("Pedidos HTTP")
b.add(timeseries("Pedidos por segundo, por código de resposta",
                 [target(f"sum by (http_response_status_code) (rate({H}_count{{{API}}}[$__rate_interval]))",
                         "{{http_response_status_code}}")], unit="reqps", stack=True, minv=0), 12, 8)
b.add(timeseries("Latência", [
    target(f"histogram_quantile(0.50, sum by (le) (rate({H}_bucket{{{API}}}[$__rate_interval])))", "p50", ref="A"),
    target(f"histogram_quantile(0.95, sum by (le) (rate({H}_bucket{{{API}}}[$__rate_interval])))", "p95", ref="B"),
    target(f"histogram_quantile(0.99, sum by (le) (rate({H}_bucket{{{API}}}[$__rate_interval])))", "p99", ref="C"),
], unit="s", minv=0), 12, 8)
b.add(timeseries("Latência p95 por rota", [target(
    f'histogram_quantile(0.95, sum by (le, http_request_method, http_route) (rate({H}_bucket{{{API},http_route!=""}}[$__rate_interval])))',
    "{{http_request_method}} {{http_route}}")], unit="s", minv=0), 24, 9)
b.add(bargauge("Pedidos por rota (período)",
               f'sort_desc(round(sum by (http_request_method, http_route) (increase({H}_count{{{API},http_route!=""}}[$__range]))))',
               "{{http_request_method}} {{http_route}}"), 12, 10)
b.add(bargauge("Erros por rota (período)",
               f'sort_desc(label_replace(round(sum by (http_request_method, http_route, http_response_status_code) (increase({H}_count{{{API},http_response_status_code=~"[45].."}}[$__range]))), "http_route", "(sem rota)", "http_route", "")) > 0',
               "{{http_response_status_code}} {{http_request_method}} {{http_route}}",
               desc="Respostas 4xx e 5xx. \"(sem rota)\" são pedidos a caminhos que não existem na API (404)."), 12, 10)

b.row("Runtime Node.js")
b.add(timeseries("CPU do processo", [target(f"sum(process_cpu_utilization{{{API}}})", "CPU")],
                 unit="percentunit", minv=0), 8, 8)
b.add(timeseries("Memória", [
    target(f"process_memory_usage{{{API}}}", "RSS", ref="A"),
    target(f"sum(v8js_memory_heap_used_bytes{{{API}}})", "heap usado", ref="B"),
    target(f"sum(v8js_memory_heap_space_size_bytes{{{API}}})", "heap reservado", ref="C"),
], unit="bytes", minv=0), 8, 8)
b.add(timeseries("Event loop", [
    target(f"nodejs_eventloop_delay_p99_seconds{{{API}}}", "atraso p99", ref="A"),
    target(f"nodejs_eventloop_delay_p50_seconds{{{API}}}", "atraso p50", ref="B"),
], unit="s", minv=0,
    desc="Atraso do event loop: valores altos indicam código síncrono a bloquear a API."), 8, 8)

b.row("Traces")
b.add(traces_table("Pedidos lentos (> 500 ms)",
                   '{ resource.service.name =~ "kwamikon-.*" && duration > 500ms }',
                   desc="Clicar num trace abre-o no Tempo, com os spans do browser e da API."), 12, 10)
b.add(traces_table("Pedidos com erro", '{ resource.service.name =~ "kwamikon-.*" && status = error }'), 12, 10)

(OUT / "kwamikon-api.json").write_text(json.dumps(dashboard(
    "kwamikon-api", "Kwamikon · API", b,
    "Pedidos, latência, erros e runtime da API NestJS (OpenTelemetry).", ["kwamikon"], time_from="now-6h"),
    ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

# --------------------------------------------------------------------------- infraestrutura
C = 'compose_project=~"$project"'
b = Board()
b.row("Servidor")
b.add(stat("CPU", '100 * (1 - avg(rate(node_cpu_seconds_total{mode="idle"}[$__rate_interval])))', unit="percent",
           decimals=1, steps=[("green", None), ("orange", 70), ("red", 90)]), 4, 5)
b.add(stat("Memória usada", "100 * (1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)",
           unit="percent", decimals=1, steps=[("green", None), ("orange", 75), ("red", 90)]), 4, 5)
b.add(stat("Disco usado", f"max(100 * (1 - max by (device) (node_filesystem_avail_bytes{{{FS}}}) / max by (device) (node_filesystem_size_bytes{{{FS}}})))",
           unit="percent", decimals=1, desc="Disco mais cheio do servidor.",
           steps=[("green", None), ("orange", 75), ("red", 90)]), 4, 5)
b.add(stat("Espaço livre", f"min(max by (device) (node_filesystem_avail_bytes{{{FS}}}))", unit="bytes",
           graph=False, steps=[("blue", None)]), 4, 5)
b.add(stat("Carga (1 min) / núcleos",
           'node_load1 / scalar(count(node_cpu_seconds_total{mode="idle"}))', unit="percentunit", decimals=0,
           desc="Acima de 100% há mais processos à espera de CPU do que núcleos disponíveis.",
           steps=[("green", None), ("orange", 0.8), ("red", 1.2)]), 4, 5)
b.add(stat("Uptime", "node_time_seconds - node_boot_time_seconds", unit="s", graph=False,
           steps=[("blue", None)]), 4, 5)

b.add(timeseries("CPU por modo", [target(
    '100 * sum by (mode) (rate(node_cpu_seconds_total{mode!="idle"}[$__rate_interval])) / scalar(count(node_cpu_seconds_total{mode="idle"}))',
    "{{mode}}")], unit="percent", stack=True, minv=0, maxv=100), 12, 8)
b.add(timeseries("Memória", [
    target("node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes", "usada", ref="A"),
    target("node_memory_Cached_bytes + node_memory_Buffers_bytes", "cache", ref="B"),
    target("node_memory_MemAvailable_bytes", "disponível", ref="C"),
    target("node_memory_SwapTotal_bytes - node_memory_SwapFree_bytes", "swap usada", ref="D"),
], unit="bytes", minv=0), 12, 8)
b.add(timeseries("Disco usado por dispositivo", [target(
    f"100 * (1 - max by (device) (node_filesystem_avail_bytes{{{FS}}}) / max by (device) (node_filesystem_size_bytes{{{FS}}}))",
    "{{device}}")], unit="percent", minv=0, maxv=100), 8, 8)
b.add(timeseries("Leitura e escrita em disco", [
    target('sum(rate(node_disk_read_bytes_total{device!~"nbd.*|loop.*"}[$__rate_interval]))', "leitura", ref="A"),
    target('sum(rate(node_disk_written_bytes_total{device!~"nbd.*|loop.*"}[$__rate_interval]))', "escrita", ref="B"),
], unit="Bps", minv=0), 8, 8)
b.add(timeseries("Carga do sistema", [
    target("node_load1", "1 min", ref="A"),
    target("node_load5", "5 min", ref="B"),
    target("node_load15", "15 min", ref="C"),
], minv=0), 8, 8)

b.row("Containers")
b.add(timeseries("CPU por container", [target(f"sum by (compose_service) (container_cpu_utilization_ratio{{{C}}})",
                                               "{{compose_service}}")],
                 unit="percent", minv=0,
                 desc="Percentagem de um núcleo: 100% é um núcleo inteiro ocupado."), 12, 8)
b.add(timeseries("Memória por container", [target(f"sum by (compose_service) (container_memory_usage_total_bytes{{{C}}})",
                                                   "{{compose_service}}")], unit="bytes", minv=0), 12, 8)
b.add(timeseries("Rede recebida por container", [target(
    f"sum by (compose_service) (rate(container_network_io_usage_rx_bytes_total{{{C}}}[$__rate_interval]))",
    "{{compose_service}}")], unit="Bps", minv=0), 8, 8)
b.add(timeseries("Rede enviada por container", [target(
    f"sum by (compose_service) (rate(container_network_io_usage_tx_bytes_total{{{C}}}[$__rate_interval]))",
    "{{compose_service}}")], unit="Bps", minv=0), 8, 8)
b.add(timeseries("Disco (leitura + escrita) por container", [target(
    f"sum by (compose_service) (rate(container_blockio_io_service_bytes_recursive_total{{{C}}}[$__rate_interval]))",
    "{{compose_service}}")], unit="Bps", minv=0), 8, 8)
b.add(bargauge("Uptime por container", f"min by (compose_service) (container_uptime_seconds{{{C}}})",
               "{{compose_service}}", unit="s"), 12, 9)
b.add(bargauge("Reinícios (período)",
               f"round(sum by (compose_service) (increase(container_restarts_total{{{C}}}[$__range])))",
               "{{compose_service}}", desc="Um valor acima de 0 indica que o container foi abaixo e reiniciou."), 12, 9)

project_var = {
    "name": "project", "label": "Projecto", "type": "query", "datasource": PROM,
    "query": {"query": "label_values(container_uptime_seconds, compose_project)", "refId": "project"},
    "definition": "label_values(container_uptime_seconds, compose_project)",
    "regex": "/kwamikon.*/", "refresh": 2, "includeAll": True, "multi": True,
    "current": {"selected": True, "text": ["All"], "value": ["$__all"]}, "sort": 1,
}
(OUT / "kwamikon-infra.json").write_text(json.dumps(dashboard(
    "kwamikon-infra", "Kwamikon · Infraestrutura", b,
    "CPU, memória, disco e rede do servidor (node-exporter) e de cada container (docker_stats).",
    ["kwamikon"], variables=[project_var], time_from="now-6h"),
    ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

print("ok")
