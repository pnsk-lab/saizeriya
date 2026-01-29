
$(function(){
	console.log("ready");
	
	//ボディの高さを調整
	body = $('#footer').offset().top - ($('#header').offset().top + $('#header').height()) - (Number($('#body-section').css('padding-top').replace('px', '')) + Number($('#body-section').css('padding-bottom').replace('px', '')));
	$('#body-section').height(body);
	
	//各プロシージャ呼出
	if(typeof onReadyExpand == 'function')
		onReadyExpand();
	
	// imgタグにtitleを追加する
	$("img[alt],a[alt],div[alt],li[alt],area[alt]").each(function(){
		var a=$(this).attr("alt");
		if(a.length>0&&!$(this).attr("title")){
			$(this).attr("title",a);
		}
	});
});

//メッセージボックス表示時のスクロール無効化
function handleTouchMove(event) {
	if(!isPinchZooming()){
		event.preventDefault();
	}
}

//ピンチズームされているかを調べる
function isPinchZooming() {
	if ('visualViewport' in window) {
		return window.visualViewport.scale > 1
	} else {
		return document.documentElement.clientWidth > window.innerWidth
	}
}

//スクロール制御
var scrollPos = 0;
function disableScroll(reset = true) {
	if(reset){
		scrollPos = $(window).scrollTop();
		$('body').css({
			'position': 'fixed',
			'width': '100%',
			'z-index': '1',
			'top': -scrollPos
		});
	}
	else{
		$('body').css({
			'position': 'relative',
			'width': 'auto',
			'top': 'auto'
		});
		$('html, body').scrollTop(scrollPos);
	}
}

$(window).on('load', function(){
	console.log("load");

	//メッセージボックス定義
	$.alert = function(message){
		var dfd = $.Deferred();
		// ダイアログを作成
		var dlg = $("<div></div>").dialog({
			modal: true,
			width: '80vw',
			position: {my: "center center", at: "center center", of: "#base-overlay"},
			appendTo: "#base-overlay",
			buttons: {
				"OK": function(){
					$(this).dialog("close");
					dfd.resolve();
				}
			},
			close: function() {
				disableScroll(false);
				//document.removeEventListener('touchmove', handleTouchMove, { passive: false });
				$('#base-overlay').remove();
			}
		});
		dlg.html(message);
		return dfd.promise();
	};

	$.confirm = function(message, reverse){
		var dfd = $.Deferred();
		// ダイアログを作成
		if(!reverse){
			var dlg = $("<div></div>").dialog({
				modal: true,
				width: '80vw',
				position: {my: "center center", at: "center center", of: "#base-overlay"},
				appendTo: "#base-overlay",
				buttons: {
					"いいえ": function(event, ui){
						$(this).dialog("close");
						dfd.resolve("cancel");
					},
					"はい": function(){
						$(this).dialog("close");
						dfd.resolve("yes");
					}
				},
				close: function() {
					disableScroll(false);
					//document.removeEventListener('touchmove', handleTouchMove, { passive: false });
					$('#base-overlay').remove();
				}
			});
		}
		else{
			var dlg = $("<div></div>").dialog({
				modal: true,
				width: '80vw',
				position: {my: "center center", at: "center center", of: "#base-overlay"},
				appendTo: "#base-overlay",
				buttons: {
					"はい": function(){
						$(this).dialog("close");
						dfd.resolve("yes");
					},
					"いいえ": function(event, ui){
						$(this).dialog("close");
						dfd.resolve("cancel");
					}
				},
				close: function() {
					disableScroll(false);
					//document.removeEventListener('touchmove', handleTouchMove, { passive: false });
					$('#base-overlay').remove();
				}
			});
		}
		dlg.html(message);
		return dfd.promise();
	};

	window.old_alert = window.alert;
	window.alert =  function(message, okCallback=function(){}){
		if($('body').find('#base-overlay').length > 0)
			return;
		$('body').append('<div id="base-overlay" class="ui-widget-overlay ui-front" style="z-index: 9999998;"></div>');
		disableScroll();
		//document.addEventListener('touchmove', handleTouchMove, { passive: false });
		$.alert(message)
		.then(function(status){
			okCallback();
			disableScroll(false);
			//document.removeEventListener('touchmove', handleTouchMove, { passive: false });
			$('#base-overlay').remove();
		});
		//一番後ろのボタンにフォーカス
		$('.ui-dialog-buttonset>button:last-child').focus();
	}
	window.old_confirm = window.confirm;
	window.confirm =  function(message, okCallback, cancelCallback=function(){}, reverse=false){
		if($('body').find('#base-overlay').length > 0)
			return;
		$('body').append('<div id="base-overlay" class="ui-widget-overlay ui-front" style="z-index: 9999998;"></div>');
		disableScroll();
		//document.addEventListener('touchmove', handleTouchMove, { passive: false });
		$.confirm(message, reverse)
		.then(function(status){
			var ret = (status === "yes");
			if(ret)
				okCallback();
			else
				cancelCallback();
			disableScroll(false);
			//document.removeEventListener('touchmove', handleTouchMove, { passive: false });
			$('#base-overlay').remove();
		});
		//一番後ろのボタンにフォーカス
		$('.ui-dialog-buttonset>button:last-child').focus();
	}

	//タイトル点滅
	$('div#header>h1').addClass('blinking');

	//各プロシージャ呼出
	if(typeof onLoadExpand == 'function')
		onLoadExpand();

	//メッセージがあれば表示（スクロール完成後に表示の為ディレイ処理）
	if($('#message').val() != ''){
		setTimeout(function(){
			alert($('#message').val());
			$('#message').val('');
		},100);
	}
/*	if($('.notice-balloon:not(.show)').length > 0){
		setTimeout(function(){
			$('.notice-balloon').addClass('show');
			$('#notice-sound')[0].currentTime = 0;
			$('#notice-sound')[0].play();
		},100);
	}*/
});

$(window).on('orientationchange resize', function() {
	console.log("orientationchange resize");
	
	//ボディの高さを調整
	body = $('#footer').offset().top - ($('#header').offset().top + $('#header').height()) - (Number($('#body-section').css('padding-top').replace('px', '')) + Number($('#body-section').css('padding-bottom').replace('px', '')));
	$('#body-section').height(body);
	
	//各プロシージャ呼出
	if(typeof onResizeExpand == 'function')
		onResizeExpand();
});

$(window).scroll(function(){
	console.log("scroll");
	
	// 「ページトップへ」を表示
	if($(this).scrollTop()>100){
		$("#pagetop").fadeIn();
	}else{
		$("#pagetop").fadeOut();
	}
	
	//各プロシージャ呼出
	if(typeof onScrollExpand == 'function')
		onScrollExpand();
});
        
// 「ページトップへ」クリック時
$(document).on({'click': function(){
	$("body,html").animate({scrollTop:0},300);
	return false;
}},'#pagetop');

// ヘッダー帯 クリック時
$(document).on({'click': function(){
	$('#proc').val('top');
	$('#frm_ctrl').submit();
	return false;
}},'#header>h1');

// スワイプ処理
var sd, sx, sy, ey;
$(window).on('touchstart', function(e){sx=e.originalEvent.touches[0].pageX;sy=e.originalEvent.touches[0].pageY;ey=e.originalEvent.touches[0].pageY;sd=''});
$(window).on('touchmove', function(e){if(sx-e.originalEvent.touches[0].pageX>100){sd='L'}else if(sx-e.originalEvent.touches[0].pageX<-100){sd='R'};ey=e.originalEvent.touches[0].pageY});
$(window).on('touchend', function(e){if($('#base-overlay').length) return; if(Math.abs(sy-ey)<25){if(sd=='R'){onSwipeRight()}else if(sd=='L'){onSwipeLeft()}}});

// 注文追加クリック時
$(document).on({'click': function(){
	if ($(this).hasClass('disabled'))
		return false;
		
	sid = String($('#shop-id').val()).trim();
	$.ajax({	
		url:"./src/cmd/check_lastorder.php",
		type:"POST",
		data:'sid=' + sid,
		dataType:"json",
		cache:false,
		timespan:1000
	}).done(function(data, textStatus, jqXHR){
		console.log(data);
		if (data['result'] == 'OK'){
			alert('ラストオーダーの時間を過ぎている為、注文を送信できません。', function() {
				$('#proc').val('account');
				$('#ctrl').val('clear');
				$('#frm_ctrl').submit();
			});
		}
		else{
			$('#proc').val('menu');
			$('#frm_ctrl').submit();
		}
	}).fail(function(jqXHR, textStatus, errorThrown){
		console.log('error');
		$('#proc').val('menu');
		$('#frm_ctrl').submit();
	});
	
	return false;
}},'#order-add');

// 注文リストクリック時
$(document).on({'click': function(){
	if ($(this).hasClass('disabled'))
		return false;
		
	sid = String($('#shop-id').val()).trim();
	$.ajax({	
		url:"./src/cmd/check_lastorder.php",
		type:"POST",
		data:'sid=' + sid,
		dataType:"json",
		cache:false,
		timespan:1000
	}).done(function(data, textStatus, jqXHR){
		console.log(data);
		if (data['result'] == 'OK'){
			alert('ラストオーダーの時間を過ぎている為、注文を送信できません。', function() {
				$('#proc').val('account');
				$('#ctrl').val('clear');
				$('#frm_ctrl').submit();
			});
		}
		else{
			$('#proc').val('main');
			$('#frm_ctrl').submit();
		}
	}).fail(function(jqXHR, textStatus, errorThrown){
		console.log('error');
		$('#proc').val('main');
		$('#frm_ctrl').submit();
	});
	
	return false;
}},'#order-list');

// 注文履歴クリック時
$(document).on({'click': function(){
	if (!$(this).hasClass('disabled')){
		$('#proc').val('history');
		$('#frm_ctrl').submit();
	}
	return false;
}},'#order-history');

// 店員呼出クリック時
$(document).on({'click': function(){
	if (!$(this).hasClass('disabled')){
		$('#proc').val('call');
		$('#frm_ctrl').submit();
	}
	return false;
}},'#after-call');

// 会計クリック時
$(document).on({'click': function(){
	if (!$(this).hasClass('disabled')){
		$('#proc').val('account');
		$('#frm_ctrl').submit();
	}
	return false;
}},'#do-account');

// バルーンクリック時
$(document).on({'click': function(){
	$(this).parent().parent().removeClass('show');
	return false;
}},'.notice-balloon .ui-dialog-buttonset button');

function onReadyExpand(){
	console.log("ready");
	
}

function onLoadExpand(){
	console.log("load");
	
	cd = String($('#enter').text()).trim();
	if (cd.length == 4){
		getMenuName(true);
	}
	
	$.alcohol = function(title, message){
		var dfd = $.Deferred();
		// ダイアログを作成
		var dlg = $("<div></div>").dialog({
			modal: true,
			width: '80vw',
			position: {my: "center center", at: "center center", of: "#base-overlay"},
			appendTo: "#base-overlay",
			buttons: {
				"もどる": function(event, ui){
					$(this).dialog("close");
					dfd.resolve("cancel");
				},
				"確認": function(){
					$(this).dialog("close");
					dfd.resolve("yes");
				}
			},
			close: function() {
				disableScroll(false);
				$('#base-overlay').remove();
			}
		});
		dlg.html('<h6 class="title">' + title + '</h6>' + '<p class="message">' + message + '</p>');
		return dfd.promise();
	};
	window.alcohol =  function(title, message, okCallback, cancelCallback=function(){}){
		if($('body').find('#base-overlay').length > 0)
			return;
		$('body').append('<div id="base-overlay" class="ui-widget-overlay ui-front" style="z-index: 9999998;"></div>');
		disableScroll();
		//document.addEventListener('touchmove', handleTouchMove, { passive: false });
		$.alcohol(title, message)
		.then(function(status){
			var ret = (status === "yes");
			if(ret)
				okCallback();
			else
				cancelCallback();
			disableScroll(false);
			$('#base-overlay').remove();
		});
		//一番後ろのボタンにフォーカス
		$('.ui-dialog-buttonset>button:last-child').focus();
	}
	
	cd = String($('#enter').text()).trim();
	if (cd.length == 4){
		getMenuName(true);
	}
}

function onScrollExpand(){
	console.log("scroll");
	
}

function onResizeExpand() {
	console.log("orientationchange resize");
	
}

$('#sidemenu').scroll(function(){
	console.log("scroll_side");
	
});

function onSwipeLeft(){
    console.log('left swipe');
	
}
function onSwipeRight(){
    console.log('right swipe');
	
}

// 番号キーをクリック時
$(document).on({'click': function(){
/*	$("audio#play-" + String($(this).data('val')).trim()).get(0).play();*/
	cd = String($('#enter').text()).trim() + String($(this).data('val')).trim();
	if (cd.length <= 0)
		cd = '&nbsp;';
	if (cd.length > 4){
		alert(sprintf("メニュー番号は%d桁で入力してください。", 4));
		return false;
	}
	$('#enter').html(cd);
	getMenuName();
	return false;
}},'li.num');

// 取消キーをクリック時
$(document).on({'click': function(){
/*	$("audio#play-kome").get(0).play();*/
/*	$('#enter').html('&nbsp;');
	getMenuName();*/
	return false;
}},'li.clear');

// 削除キーをクリック時
$(document).on({'click': function(){
/*	$("audio#play-sharp").get(0).play();*/
	cd = String($('#enter').text()).trim();
	cd = cd.slice(0, -1);
	if (cd.length <= 0)
		cd = '&nbsp;';
	$('#enter').html(cd);
	getMenuName();
	$('#is_reorder').val('0');
	return false;
}},'li.del');

function getMenuName(reorder=false){
	find = false;
	nm = '&nbsp;';
	pr = 0;
	ssid = String($('#session-id').val()).trim();
	sid = String($('#shop-id').val()).trim();
	tno = String($('#table-no').val()).trim();
	lng = String($('#cur_lang').val()).trim();
	num = Number(String($('#number').val()).trim());
	cd = String($('#enter').text()).trim();
	mc = '';
	mn = '';
	mi = 0;
	mg = '';
	pm = '';
	nt = '';
	al = false;
	
	if (cd.length != 4){
		$('.menu>.command>.name').html(nm);
		$('.menu>.logo').removeClass('hidden');
		return;
	}
	
	$.ajax({	
		url:"./src/cmd/get_item.php",
		type:"POST",
		data:'sid=' + sid + '&tno=' + tno + '&lng=' + lng + '&id=' + cd + '&num=' + num + '&ssid=' + ssid,
		dataType:"json",
		cache:false,
		timespan:1000
	}).done(function(data, textStatus, jqXHR){
		console.log(data);
		if (data['result'] == 'OK'){
			switch(Number(data['item_data']['state'])){
			case 0:
				alert(sprintf('申し訳ございません。<br />%sは、<br />ただいま品切れしております。', data['item_data']['name']));
				break;
			case 1:
				break;
			case 2:
			default:
				chk = 0;
				if(data['item_data']['popup'] != '') chk++;
				if(data['item_data']['notice'] != '') chk++;
				if(data['item_data']['arc_type'] > 0) chk++;
				if(chk <= 1){
					nm = data['item_data']['name'];
					pr = data['item_data']['price'];
					mc = data['item_data']['mod_id'];
					mn = data['item_data']['mod_name'];
					mi = data['item_data']['mod_ini_cnt'];
					mg = data['item_data']['mod_guid'];
					pm = data['item_data']['popup'];
					nt = data['item_data']['notice'];
					al = (data['alcohol_check'] == 1);
					find = true;
				}
				else{
					alert('データ設定エラーです。');
				}
				break;
			}
		}
		else{
			console.log('not find.');
			if (cd.length == 4){
				alert('この番号のメニューが見つかりません。<br />メニュー番号をお確かめください。');
			}
		}
	}).fail(function(jqXHR, textStatus, errorThrown){
		console.log('error');
		alert('エラーです。<br />スタッフにご確認ください。');
	}).always(function(){
		$('.menu>.command>.name').html(nm);
		$('.detail>.main>#code').val(cd);
		$('.detail>.main>.name>dt').html(nm);
		$('.detail>.main>.name>dd').html(pr.toLocaleString() + '円');
		$('.detail>.main>.amount>li>#amount').val(1);
		$('.detail>.mod>#mod_code').val(mc);
		$('.detail>.mod>.name>dt').html(mn);
		$('.detail>.mod>.amount>li>#mod_amount').val(mi);
		if(mg!=""){
			$('.detail>.mod>#guide>.msg-base>span').html(mg);
			$('.detail>.mod>#guide').css({'display':'block'});
		}
		else{
			$('.detail>.mod>#guide').css({'display':'none'});
		}
		if(mc=="")	$('.detail>.mod').css({'display':'none'});
		else		$('.detail>.mod').css({'display':'block'});
		
		if (find){
			$('.menu>.logo').addClass('hidden');
			
			if (reorder){
				if (!$('.base').hasClass("detail")){
					$('.base').addClass("detail");
					$('h1').html('数量を選択してください');
					if($('.detail>.mod>#guide').css('display') != "none"){
						$('#notice-sound')[0].currentTime = 0;
						$('#notice-sound')[0].play();
					}
				}
			}
			
			if(nt != ''){
				$('.notice-balloon').removeClass('show');
				$('.notice-balloon span').html(nt);
				ds = 5;
				tp = $('#body-section>div.menu>div.code').offset().top - $('#body-section').offset().top - ds;
				lt = $('#body-section>div.menu>div.code').offset().left - $('#body-section').offset().left - ds;
				wd = $('#body-section>div.menu>div.code').width() - ds * 2;
				hg = $('#body-section>div.menu>div.code').height() + Number($('#body-section>div.menu>div.code').css('margin-bottom').replace('px', '')) + $('#body-section>div.menu>div.tenkey').height() - ds * 2;
				console.log(tp+', '+lt+', '+wd+', '+hg);
				$('.notice-balloon').css({'top':'calc(1.5vh + '+tp+'px)','left':'calc(1.5vh + '+lt+'px)','width':'calc(100vw - (1.5vh + '+lt+'px) * 2)','min-height':hg});
				if($('.notice-balloon:not(.show)').length > 0){
					setTimeout(function(){
						$('.notice-balloon').addClass('show');
						$('#notice-sound')[0].currentTime = 0;
						$('#notice-sound')[0].play();
					},100);
				}
			}
			
			if(pm != ''){
				confirm(pm, function() {}, function() {
					$('#enter').html('&nbsp;');
					$('.menu>.logo').removeClass('hidden');
				});
			}
			
			if(al){
				alcohol('アルコール販売についてのご確認', '20歳未満のお客様、およびお車や自転車などを運転されるお客様へのアルコール販売をお断りしております。', function() {
					//console.log('ここで記録！');
					$.ajax({	
						url:"./src/cmd/put_alcohol.php",
						type:"POST",
						data:'sid=' + sid + '&tno=' + tno + '&ssid=' + ssid,
						dataType:"json",
						cache:false,
						timespan:1000
					}).done(function(data, textStatus, jqXHR){
						console.log(data);
					});
				}, function() {
					$('#enter').html('&nbsp;');
					$('.menu>.logo').removeClass('hidden');
				});
			}
		}
		else{
			$('.menu>.logo').removeClass('hidden');
		}
	});
	
}

// 注文ボタンをクリック時
$(document).on({'click': function(){
	cd = String($('#enter').text()).trim();
	if (cd.length <= 0){
		alert('メニュー番号を入力してください。');
		return false;
	}
	else if(cd.length != 4){
		alert(sprintf('メニュー番号は%d桁で入力してください。', 4));
		return false;
	}
	if (!$('.base').hasClass("detail")){
		$('.base').addClass("detail");
		$('h1').html('数量を選択してください');
		if($('.detail>.mod>#guide').css('display') != "none"){
			$('#notice-sound')[0].currentTime = 0;
			$('#notice-sound')[0].play();
		}
	}
	return false;
}},'#order');

// －ボタンをクリック時
$(document).on({'click': function(){
	if($(this).hasClass("disabled"))
		return false;
	ed = $(this).next().children('input');
	amount = Number(ed.val());
	amount--;
	if($(this).parent().parent().hasClass('mod')){
		if (amount < 0)
			amount = 0;
	}
	else{
		if (amount < 1)
			amount = 1;
	}
	ed.val(amount);
	return false;
}},'#minus');

// ＋ボタンをクリック時
$(document).on({'click': function(){
	if($(this).hasClass("disabled"))
		return false;
	ed = $(this).prev().children('input');
	amount = Number(ed.val());
	amount++;
	if (amount > 99)
		amount = 99;
	ed.val(amount);
	return false;
}},'#plus');

// もどるボタンをクリック時
$(document).on({'click': function(){
	if($('#sub_ctrl').val() == 'add_drink'){
		$('#proc').val('top');
		$('#frm_ctrl').submit();
	}
	else{
		if ($('.base').hasClass("detail")){
			$('.base').removeClass("detail");
			$('h1').html('メニューブックから番号を入力してください');
		}
	}
	return false;
}},'#back');

// 確定キーをクリック時
$(document).on({'click': function(){
	cd = String($('#enter').text()).trim();
	if(cd.length != 4){
		alert(sprintf('メニュー番号は%d桁で入力してください。', 4));
		$('.base').removeClass("detail");
		$('h1').html('メニューブックから番号を入力してください');
		return false;
	}
	if($('#sub_ctrl').val() == 'add_drink'){
		$('#proc').val('order');
		$('#sub_ctrl').val('add_drink');
		$('#ord-drkbar-cnt').val(Number($('#amount').val()));
		$('#frm_ctrl').submit();
	}
	else{
		var now = new Date();
		var y = now.getFullYear();
		var m = now.getMonth() + 1;
		var d = now.getDate();
		var h = now.getHours();
		var mi = now.getMinutes();
		var s = now.getSeconds();
		var mm = ('0' + m).slice(-2);
		var dd = ('0' + d).slice(-2);
		var hh = ('0' + h).slice(-2);
		var mmi = ('0' + mi).slice(-2);
		var ss = ('0' + s).slice(-2);
		strOrderTime = y + '/' + mm + '/' + dd + ',' + hh + ':' + mmi + ':' + ss;
		$('#proc').val('main');
		$('#ctrl').val('add');
		$('#order-time').val(strOrderTime);
		$('#frm_ctrl').submit();
	}
	return false;
}},'#deside');

function getObjectHeight(obj){
	if(!obj.length)
		return 0;
	return obj.height() + (Number(obj.css('padding-top').replace('px', '')) + Number(obj.css('padding-bottom').replace('px', ''))) + (Number(obj.css('margin-top').replace('px', '')) + Number(obj.css('margin-bottom').replace('px', ''))) + (Number(obj.css('border-top-width').replace('px', '')) + Number(obj.css('border-bottom-width').replace('px', '')));
}